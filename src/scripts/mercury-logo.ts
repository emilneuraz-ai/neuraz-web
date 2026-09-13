import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

interface InitOptions {
  signal?: AbortSignal;
}

interface FluidMetadata {
  version: number;
  width: number;
  height: number;
  frameCount: number;
  fps: number;
  heightScale: number;
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  encoding?: string;
  rowOrder?: string;
  sampleConvention?: string;
}

interface FluidSurface {
  object: THREE.Group;
  setTime: (seconds: number) => void;
  sampleTop: (u: number, v: number, target: THREE.Vector3) => boolean;
  dispose: () => void;
}

function finishParameters(finish: string | undefined) {
  if (finish === 'porcelain') {
    return { color: 0xf5f4ef, metalness: 0, roughness: 0.36, clearcoat: 0.12, clearcoatRoughness: 0.32, specularIntensity: 0.55 };
  }
  return finish === 'mercury'
    ? { color: 0xdde1e5, metalness: 1, roughness: 0.16, clearcoat: 0.2, clearcoatRoughness: 0.12, specularIntensity: 1 }
    : { color: 0x080808, metalness: 0, roughness: 0.82, clearcoat: 0, clearcoatRoughness: 0.82, specularIntensity: 0.16 };
}

/** Smooth occupancy sampled by the geometric contour, never used as alpha. */
function createFluidCoverage(metadata: FluidMetadata, buffer: ArrayBuffer) {
  const { width, height, frameCount } = metadata;
  const count = width * height;
  const words = new Uint32Array(buffer);
  const coverage = new Uint8Array(count * frameCount);
  const horizontal = new Uint16Array(count);
  for (let frame = 0; frame < frameCount; frame++) {
    const offset = frame * count;
    for (let row = 0; row < height; row++) {
      const rowStart = row * width;
      for (let col = 0; col < width; col++) {
        const index = rowStart + col;
        const left = col > 0 && words[offset + index - 1] !== 0 ? 255 : 0;
        const middle = words[offset + index] !== 0 ? 255 : 0;
        const right = col + 1 < width && words[offset + index + 1] !== 0 ? 255 : 0;
        horizontal[index] = left + middle * 2 + right;
      }
    }
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const index = row * width + col;
        const below = row > 0 ? horizontal[index - width] : 0;
        const above = row + 1 < height ? horizontal[index + width] : 0;
        coverage[offset + index] = Math.round((below + horizontal[index] * 2 + above) / 16);
      }
    }
  }
  return coverage;
}

/** Cache rows run from yMin to yMax. RG encodes top16, BA bottom16, MSB first. */
async function loadFluidCache(root: HTMLElement, signal: AbortSignal) {
  const metadataUrl = root.dataset.fluidMetadataSrc || '/models/neuraz-mercury-fluid.json';
  const dataUrl = root.dataset.fluidSrc || '/models/neuraz-mercury-fluid.bin.gz';
  const [metadataResponse, dataResponse] = await Promise.all([
    fetch(metadataUrl, { signal }), fetch(dataUrl, { signal }),
  ]);
  if (!metadataResponse.ok || !dataResponse.ok) throw new Error('The fluid animation cache is unavailable.');
  const metadata = await metadataResponse.json() as FluidMetadata;
  const { width, height, frameCount, fps, heightScale, bounds } = metadata;
  if (metadata.version !== 1 || !Number.isInteger(width) || !Number.isInteger(height)
    || width < 2 || height < 2 || width > 512 || height > 512
    || !Number.isInteger(frameCount) || frameCount < 2 || frameCount > 360
    || !Number.isFinite(fps) || fps < 1 || fps > 120
    || !Number.isFinite(heightScale) || heightScale <= 0 || heightScale > 10
    || !bounds || ![bounds.xMin, bounds.xMax, bounds.yMin, bounds.yMax].every(Number.isFinite)
    || bounds.xMax <= bounds.xMin || bounds.yMax <= bounds.yMin
    || (metadata.encoding && metadata.encoding !== 'rg-top16-ba-bottom16-xor-delta')
    || (metadata.rowOrder && metadata.rowOrder !== 'bottom-to-top')
    || (metadata.sampleConvention && metadata.sampleConvention !== 'inclusive-grid')) {
    throw new Error('The fluid animation cache format is invalid.');
  }
  const expectedBytes = width * height * frameCount * 4;
  if (expectedBytes > 128 * 1024 * 1024) throw new Error('The fluid animation cache is too large.');
  const compressed = await dataResponse.arrayBuffer();
  const signature = new Uint8Array(compressed, 0, Math.min(2, compressed.byteLength));
  let buffer: ArrayBuffer;
  if (signature[0] === 0x1f && signature[1] === 0x8b) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Gzip streaming is unavailable.');
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
    buffer = await new Response(stream).arrayBuffer();
  } else {
    // Some hosts apply Content-Encoding:gzip to an already named .gz asset;
    // fetch then returns its decompressed bytes directly.
    buffer = compressed;
  }
  if (signal.aborted) throw new DOMException('Fluid loading was aborted.', 'AbortError');
  if (buffer.byteLength !== expectedBytes) throw new Error('The fluid animation cache is incomplete.');
  const words = new Uint32Array(buffer);
  const pixelsPerFrame = width * height;
  // XOR operates identically on the four bytes regardless of host endianness.
  for (let index = pixelsPerFrame; index < words.length; index++) words[index] ^= words[index - pixelsPerFrame];
  return { metadata, buffer };
}

function createFluidSurface(metadata: FluidMetadata, source: ArrayBuffer, root: HTMLElement): FluidSurface {
  const { width, height, frameCount, fps, heightScale, bounds } = metadata;
  const boundsWidth = bounds.xMax - bounds.xMin;
  const boundsHeight = bounds.yMax - bounds.yMin;
  const bytesPerFrame = width * height * 4;
  let buffer: ArrayBuffer | undefined = source;
  let coverage: Uint8Array | undefined = createFluidCoverage(metadata, source);
  let disposed = false;
  const frameData = (index: number) => new Uint8Array(buffer!, index * bytesPerFrame, bytesPerFrame);
  const coverageData = (index: number) => coverage!.subarray(index * width * height, (index + 1) * width * height);
  const texture = (index: number, mask = false) => {
    const result = new THREE.DataTexture(mask ? coverageData(index) : frameData(index), width, height, mask ? THREE.RedFormat : THREE.RGBAFormat, THREE.UnsignedByteType);
    result.minFilter = THREE.LinearFilter;
    result.magFilter = THREE.LinearFilter;
    result.generateMipmaps = false;
    result.flipY = false;
    result.unpackAlignment = 1;
    result.colorSpace = THREE.NoColorSpace;
    result.needsUpdate = true;
    return result;
  };
  let textureA = texture(0);
  let textureB = texture(1);
  let coverageA = texture(0, true);
  let coverageB = texture(1, true);
  let currentFrame = 0;
  const uniforms = {
    mercuryFrameA: { value: textureA },
    mercuryFrameB: { value: textureB },
    mercuryCoverageA: { value: coverageA },
    mercuryCoverageB: { value: coverageB },
    mercuryMix: { value: 0 },
    mercuryHeightScale: { value: heightScale },
    mercuryTexel: { value: new THREE.Vector2(1 / width, 1 / height) },
    mercuryGridStep: { value: new THREE.Vector2(1 / (width - 1), 1 / (height - 1)) },
    mercurySize: { value: new THREE.Vector2(boundsWidth, boundsHeight) },
  };
  const shaderFunctions = /* glsl */ `
    uniform sampler2D mercuryFrameA;
    uniform sampler2D mercuryFrameB;
    uniform sampler2D mercuryCoverageA;
    uniform sampler2D mercuryCoverageB;
    uniform float mercuryMix;
    uniform float mercuryHeightScale;
    uniform float mercurySide;
    uniform vec2 mercuryTexel;
    uniform vec2 mercuryGridStep;
    uniform vec2 mercurySize;
    vec2 mercurySampleUv(vec2 gridUv) {
      return clamp(gridUv, 0.0, 1.0) * (1.0 - mercuryTexel) + mercuryTexel * 0.5;
    }
    float mercuryCoverage(vec2 gridUv) {
      vec2 sampleUv = mercurySampleUv(gridUv);
      return mix(texture2D(mercuryCoverageA, sampleUv).r, texture2D(mercuryCoverageB, sampleUv).r, mercuryMix);
    }
    float mercuryHeight(vec2 gridUv) {
      vec2 sampleUv = mercurySampleUv(gridUv);
      vec4 sampled = mix(texture2D(mercuryFrameA, sampleUv), texture2D(mercuryFrameB, sampleUv), mercuryMix);
      vec2 bytes = mercurySide > 0.0 ? sampled.rg : sampled.ba;
      float height = dot(bytes, vec2(256.0, 1.0)) * (mercuryHeightScale / 257.0);
      return height * pow(smoothstep(0.5, 0.8, mercuryCoverage(gridUv)), 0.25);
    }
    attribute vec2 mercuryTriangleA;
    attribute vec2 mercuryTriangleB;
    attribute vec2 mercuryTriangleC;
    vec2 mercuryCorner(float corner) {
      return corner < 0.5 ? mercuryTriangleA : corner < 1.5 ? mercuryTriangleB : mercuryTriangleC;
    }
    float mercuryCornerValue(float corner, vec3 values) {
      return corner < 0.5 ? values.x : corner < 1.5 ? values.y : values.z;
    }
    vec2 mercuryCrossing(vec2 a, vec2 b, float ca, float cb) {
      // Canonical endpoint order gives adjacent triangles and both skins the
      // exact same floating-point position on their shared contour edge.
      if (a.x > b.x || (a.x == b.x && a.y > b.y)) {
        vec2 swapUv = a; a = b; b = swapUv;
        float swapCoverage = ca; ca = cb; cb = swapCoverage;
      }
      return mix(a, b, clamp(ca / (ca - cb), 0.0, 1.0));
    }
    void mercuryClipTriangle(float slot, out vec2 surfaceUv, out float boundary, out float triangleEnabled) {
      vec3 values = vec3(mercuryCoverage(mercuryTriangleA), mercuryCoverage(mercuryTriangleB), mercuryCoverage(mercuryTriangleC)) - 0.5;
      vec3 inside = step(vec3(0.0), values);
      float count = inside.x + inside.y + inside.z;
      boundary = 0.0;
      triangleEnabled = count < 0.5 || (slot > 2.5 && (count < 1.5 || count > 2.5)) ? 0.0 : 1.0;
      if (count < 0.5) {
        // Outside triangles collapse to a point, so there is no transparent
        // sheet covering the logo's holes or its disconnected components.
        surfaceUv = mercuryTriangleA;
        boundary = 1.0;
      } else if (count > 2.5) {
        surfaceUv = mercuryCorner(slot < 2.5 ? slot : 0.0);
      } else {
        float isolated = count < 1.5
          ? (inside.x > 0.5 ? 0.0 : inside.y > 0.5 ? 1.0 : 2.0)
          : (inside.x < 0.5 ? 0.0 : inside.y < 0.5 ? 1.0 : 2.0);
        float following = mod(isolated + 1.0, 3.0);
        float preceding = mod(isolated + 2.0, 3.0);
        vec2 a = mercuryCorner(isolated);
        vec2 b = mercuryCorner(following);
        vec2 c = mercuryCorner(preceding);
        float ca = mercuryCornerValue(isolated, values);
        vec2 ab = mercuryCrossing(a, b, ca, mercuryCornerValue(following, values));
        vec2 ac = mercuryCrossing(a, c, ca, mercuryCornerValue(preceding, values));
        if (count < 1.5) {
          // One inside corner produces one triangle; its spare collapses.
          surfaceUv = slot < 0.5 || slot > 2.5 ? a : slot < 1.5 ? ab : ac;
          boundary = slot > 0.5 && slot < 2.5 ? 1.0 : 0.0;
        } else {
          // Two inside corners produce the quad [ab,b,c,ac], split consistently.
          surfaceUv = slot < 0.5 || (slot > 2.5 && slot < 3.5) ? ab
            : slot < 1.5 ? b : slot < 4.5 ? c : ac;
          boundary = slot < 0.5 || (slot > 2.5 && slot < 3.5) || slot > 4.5 ? 1.0 : 0.0;
        }
      }
      if (boundary < 0.5) {
        float cornerValue = all(equal(surfaceUv, mercuryTriangleA)) ? values.x
          : all(equal(surfaceUv, mercuryTriangleB)) ? values.y : values.z;
        // At a topology change the contour can pass exactly through a grid
        // corner. Give that corner the same rim normal as its clipped neighbors.
        if (abs(cornerValue) < 0.0000001) boundary = 1.0;
      }
    }
  `;
  const material = (side: 1 | -1, outline = false) => {
    const result = new THREE.MeshPhysicalMaterial({
      ...(outline ? { color: 0x090909, metalness: 0, roughness: 1, clearcoat: 0, specularIntensity: 0 } : finishParameters(root.dataset.finish)),
      side: (side === 1) !== outline ? THREE.FrontSide : THREE.BackSide,
    });
    result.customProgramCacheKey = () => `neuraz-fluid-closed-contour-v3-${side}-${outline}`;
    result.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms, { mercurySide: { value: side }, mercuryOutlineWidth: { value: outline ? 0.013 : 0 } });
      shader.vertexShader = 'uniform float mercuryOutlineWidth;\n' + shaderFunctions + '\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', /* glsl */ `
        #include <beginnormal_vertex>
        vec2 mercurySurfaceUv;
        float mercuryBoundary;
        float mercuryActive;
        mercuryClipTriangle(position.x, mercurySurfaceUv, mercuryBoundary, mercuryActive);
        if (mercuryActive > 0.5) {
        vec2 normalStep = mercuryGridStep * 1.75;
        float slopeX = (mercuryHeight(mercurySurfaceUv + vec2(normalStep.x, 0.0)) - mercuryHeight(mercurySurfaceUv - vec2(normalStep.x, 0.0))) / (2.0 * normalStep.x * mercurySize.x);
        float slopeY = (mercuryHeight(mercurySurfaceUv + vec2(0.0, normalStep.y)) - mercuryHeight(mercurySurfaceUv - vec2(0.0, normalStep.y))) / (2.0 * normalStep.y * mercurySize.y);
        objectNormal = normalize(vec3(-mercurySide * slopeX, -mercurySide * slopeY, 1.0));
        if (mercuryBoundary > 0.5) {
          vec2 inward = vec2(
            mercuryCoverage(mercurySurfaceUv + vec2(normalStep.x, 0.0)) - mercuryCoverage(mercurySurfaceUv - vec2(normalStep.x, 0.0)),
            mercuryCoverage(mercurySurfaceUv + vec2(0.0, normalStep.y)) - mercuryCoverage(mercurySurfaceUv - vec2(0.0, normalStep.y))
          ) / (normalStep * mercurySize);
          if (dot(inward, inward) < 0.00000001) inward = vec2(1.0, 0.0);
          // The two skins share a horizontal outward normal at their welded rim.
          objectNormal = normalize(vec3(-mercurySide * inward, 0.0));
        }
        }
      `);
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', /* glsl */ `
        #include <begin_vertex>
        transformed.xy = (mercurySurfaceUv - 0.5) * mercurySize;
        // Every clipped contour vertex is exactly z=0 on BOTH skins. Fragment
        // alpha cannot cut inside these triangles and expose an open sidewall.
        transformed.z = mercuryActive < 0.5 || mercuryBoundary > 0.5 ? 0.0 : mercurySide * mercuryHeight(mercurySurfaceUv);
        // The black rim is the back face of an expanded, closed shell. It follows
        // the actual volume and all animated connections, including internal holes.
        if (mercuryActive > 0.5) transformed += objectNormal * mercurySide * mercuryOutlineWidth;
      `);
    };
    return result;
  };
  const detail = root.getBoundingClientRect().width >= 700 ? 2 : 1;
  const occupied = new Uint8Array(width * height);
  for (let index = 0; index < coverage.length; index++) {
    if (coverage[index] > 127) occupied[index % occupied.length] = 1;
  }
  const trianglesA: number[] = [];
  const trianglesB: number[] = [];
  const trianglesC: number[] = [];
  const addTriangle = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
    trianglesA.push(ax / (width - 1), ay / (height - 1));
    trianglesB.push(bx / (width - 1), by / (height - 1));
    trianglesC.push(cx / (width - 1), cy / (height - 1));
  };
  for (let row = 0; row < height - 1; row++) {
    for (let col = 0; col < width - 1; col++) {
      const index = row * width + col;
      if (!occupied[index] && !occupied[index + 1] && !occupied[index + width] && !occupied[index + width + 1]) continue;
      for (let y = 0; y < detail; y++) {
        for (let x = 0; x < detail; x++) {
          const x0 = col + x / detail;
          const y0 = row + y / detail;
          const x1 = col + (x + 1) / detail;
          const y1 = row + (y + 1) / detail;
          addTriangle(x0, y0, x1, y0, x1, y1);
          addTriangle(x0, y0, x1, y1, x0, y1);
        }
      }
    }
  }
  // One instance is a grid triangle, with six slots for its clipped polygon.
  // Instancing stores each source triangle once and changes topology entirely
  // on the GPU as connections merge and terminals separate.
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0, 4, 0, 0, 5, 0, 0], 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  geometry.setAttribute('mercuryTriangleA', new THREE.InstancedBufferAttribute(new Float32Array(trianglesA), 2));
  geometry.setAttribute('mercuryTriangleB', new THREE.InstancedBufferAttribute(new Float32Array(trianglesB), 2));
  geometry.setAttribute('mercuryTriangleC', new THREE.InstancedBufferAttribute(new Float32Array(trianglesC), 2));
  geometry.instanceCount = trianglesA.length / 2;
  // The CPU slots are abstract; bounds include all shader-displaced positions.
  geometry.boundingBox = new THREE.Box3(new THREE.Vector3(-boundsWidth / 2, -boundsHeight / 2, -heightScale), new THREE.Vector3(boundsWidth / 2, boundsHeight / 2, heightScale));
  geometry.boundingSphere = geometry.boundingBox.getBoundingSphere(new THREE.Sphere());
  const frontMaterial = material(1);
  const backMaterial = material(-1);
  const object = new THREE.Group();
  const front = new THREE.Mesh(geometry, frontMaterial);
  const back = new THREE.Mesh(geometry, backMaterial);
  front.position.set((bounds.xMin + bounds.xMax) / 2, (bounds.yMin + bounds.yMax) / 2, 0);
  back.position.copy(front.position);
  object.add(front, back);
  const outlineMaterials: THREE.Material[] = [];
  if (root.dataset.finish === 'porcelain') {
    for (const side of [1, -1] as const) {
      const rimMaterial = material(side, true);
      const rim = new THREE.Mesh(geometry, rimMaterial);
      rim.position.copy(front.position);
      object.add(rim);
      outlineMaterials.push(rimMaterial);
    }
  }
  type SurfacePoint = { u: number; v: number; height: number; coverage: number };
  const sampleGrid = (u: number, v: number): SurfacePoint => {
    const gx = THREE.MathUtils.clamp(u, 0, 1) * (width - 1);
    const gy = THREE.MathUtils.clamp(v, 0, 1) * (height - 1);
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1);
    const tx = gx - x0, ty = gy - y0;
    const ids = [y0 * width + x0, y0 * width + x1, y1 * width + x0, y1 * width + x1];
    const weights = [(1 - tx) * (1 - ty), tx * (1 - ty), (1 - tx) * ty, tx * ty];
    const mix = uniforms.mercuryMix.value;
    let sampledHeight = 0, sampledCoverage = 0;
    for (const [frameIndex, weight] of [[currentFrame, 1 - mix], [(currentFrame + 1) % frameCount, mix]]) {
      if (!weight) continue;
      const heights = frameData(frameIndex);
      const mask = coverageData(frameIndex);
      for (let corner = 0; corner < 4; corner++) {
        const index = ids[corner];
        const contribution = weights[corner] * weight;
        sampledHeight += (heights[index * 4] * 256 + heights[index * 4 + 1]) * (heightScale / 65535) * contribution;
        sampledCoverage += mask[index] / 255 * contribution;
      }
    }
    const rim = THREE.MathUtils.smoothstep(sampledCoverage, 0.5, 0.8);
    return { u, v, height: sampledHeight * Math.pow(rim, 0.25), coverage: sampledCoverage };
  };
  const sampleTop = (u: number, v: number, target: THREE.Vector3) => {
    if (disposed || !buffer || !Number.isFinite(u) || !Number.isFinite(v) || u < 0 || u > 1 || v < 0 || v > 1) return false;
    const nx = (width - 1) * detail, ny = (height - 1) * detail;
    const gx = Math.min(nx - 1, Math.floor(u * nx)), gy = Math.min(ny - 1, Math.floor(v * ny));
    const fx = u * nx - gx, fy = v * ny - gy;
    const a = sampleGrid(gx / nx, gy / ny);
    const c = sampleGrid((gx + 1) / nx, (gy + 1) / ny);
    const b = fy <= fx ? sampleGrid((gx + 1) / nx, gy / ny) : sampleGrid(gx / nx, (gy + 1) / ny);
    const triangle = fy <= fx ? [a, b, c] : [a, c, b];
    const inside = triangle.map(point => point.coverage >= 0.5);
    const count = inside.filter(Boolean).length;
    if (!count) return false;
    let clipped = triangle;
    if (count < 3) {
      const isolated = inside.indexOf(count === 1);
      const start = triangle[isolated], following = triangle[(isolated + 1) % 3], preceding = triangle[(isolated + 2) % 3];
      const crossing = (end: SurfacePoint): SurfacePoint => {
        const t = (0.5 - start.coverage) / (end.coverage - start.coverage);
        return { u: THREE.MathUtils.lerp(start.u, end.u, t), v: THREE.MathUtils.lerp(start.v, end.v, t), height: 0, coverage: 0.5 };
      };
      clipped = count === 1 ? [start, crossing(following), crossing(preceding)] : [crossing(following), following, preceding, crossing(preceding)];
    }
    for (let index = 1; index + 1 < clipped.length; index++) {
      const p = clipped[0], q = clipped[index], r = clipped[index + 1];
      const determinant = (q.u - p.u) * (r.v - p.v) - (q.v - p.v) * (r.u - p.u);
      if (Math.abs(determinant) < 1e-14) continue;
      const b1 = ((u - p.u) * (r.v - p.v) - (v - p.v) * (r.u - p.u)) / determinant;
      const b2 = ((q.u - p.u) * (v - p.v) - (q.v - p.v) * (u - p.u)) / determinant;
      if (b1 < -1e-6 || b2 < -1e-6 || b1 + b2 > 1 + 1e-6) continue;
      target.set(bounds.xMin + u * boundsWidth, bounds.yMin + v * boundsHeight, p.height * (1 - b1 - b2) + q.height * b1 + r.height * b2);
      return true;
    }
    return false;
  };
  return {
    object,
    sampleTop,
    setTime(seconds) {
      if (disposed || !buffer) return;
      const position = (Math.max(0, seconds) * fps) % frameCount;
      const index = Math.floor(position);
      const next = (index + 1) % frameCount;
      if (index !== currentFrame) {
        if (index === (currentFrame + 1) % frameCount) {
          [textureA, textureB] = [textureB, textureA];
          [coverageA, coverageB] = [coverageB, coverageA];
          textureB.image.data = frameData(next);
          coverageB.image.data = coverageData(next);
          textureB.needsUpdate = true;
          coverageB.needsUpdate = true;
        } else {
          textureA.image.data = frameData(index);
          textureB.image.data = frameData(next);
          coverageA.image.data = coverageData(index);
          coverageB.image.data = coverageData(next);
          textureA.needsUpdate = textureB.needsUpdate = true;
          coverageA.needsUpdate = coverageB.needsUpdate = true;
        }
        uniforms.mercuryFrameA.value = textureA;
        uniforms.mercuryFrameB.value = textureB;
        uniforms.mercuryCoverageA.value = coverageA;
        uniforms.mercuryCoverageB.value = coverageB;
        currentFrame = index;
        root.dataset.fluidFrame = String(index + 1);
      }
      uniforms.mercuryMix.value = position - index;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      object.removeFromParent();
      geometry.dispose();
      frontMaterial.dispose();
      backMaterial.dispose();
      outlineMaterials.forEach(material => material.dispose());
      textureA.dispose();
      textureB.dispose();
      coverageA.dispose();
      coverageB.dispose();
      textureA.image.data = textureB.image.data = new Uint8Array(4);
      coverageA.image.data = coverageB.image.data = new Uint8Array(1);
      buffer = undefined;
      coverage = undefined;
    },
  };
}

/** Disposes a parsed asset once, including resources shared between its meshes. */
function disposeAsset(roots: THREE.Object3D[]) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const bitmaps = new Set<ImageBitmap>();
  const skeletons = new Set<THREE.Skeleton>();
  roots.forEach(root => root.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material) {
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => materials.add(material));
    }
    const skinned = object as THREE.SkinnedMesh;
    if (skinned.isSkinnedMesh) skeletons.add(skinned.skeleton);
  }));
  materials.forEach(material => {
    Object.values(material).forEach(value => {
      if (value instanceof THREE.Texture) textures.add(value);
    });
  });
  textures.forEach(texture => {
    const image: unknown = texture.source.data;
    if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) bitmaps.add(image);
    texture.dispose();
  });
  bitmaps.forEach(bitmap => bitmap.close());
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  skeletons.forEach(skeleton => skeleton.dispose());
}

function numberOption(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? THREE.MathUtils.clamp(parsed, min, max) : fallback;
}

/**
 * Enhances one MercuryLogo instance. Both its GLB fallback and fluid cache are
 * frontal in XY with depth along Z. The cache deforms front and back surfaces.
 */
export async function initMercuryLogo(root: HTMLElement, { signal }: InitOptions = {}): Promise<() => void> {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-mercury-canvas]');
  const stage = root.querySelector<HTMLElement>('[data-mercury-stage]');
  if (!canvas || !stage) throw new Error('MercuryLogo requires a canvas and stage.');
  if (signal?.aborted || !root.isConnected) return () => {};

  const listeners = new AbortController();
  const loading = new AbortController();
  const controls = root.querySelector<HTMLElement>('[data-mercury-controls]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-mercury-toggle]');
  const toggleLabel = root.querySelector<HTMLElement>('[data-mercury-toggle-label]');
  const reset = root.querySelector<HTMLButtonElement>('[data-mercury-reset]');
  const status = root.querySelector<HTMLElement>('[data-mercury-status]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const interactive = root.dataset.interactive !== 'false';
  const isometric = root.dataset.view === 'isometric';
  const maxDpr = numberOption(root.dataset.maxDpr, 1.75, 1, 1.75);
  const framing = numberOption(root.dataset.framing, 1.05, 1, 2);
  const pins = Array.from(root.querySelectorAll<HTMLElement>('[data-mercury-pin]')).map(element => ({
    element,
    u: Number(element.dataset.u),
    v: Number(element.dataset.v),
    top: numberOption(element.dataset.top, 0.3, 0, 0.5),
    offset: numberOption(element.dataset.zOffset, 0.025, 0, 0.2),
  }));
  pins.forEach(({ element }) => { element.dataset.visible = 'false'; });
  let renderer: THREE.WebGLRenderer | undefined;
  let environment: THREE.WebGLRenderTarget | undefined;
  let fluidSurface: FluidSurface | undefined;
  let fluidEpoch = 0;
  let assets: THREE.Object3D[] = [];
  let resizeObserver: ResizeObserver | undefined;
  let visibilityObserver: IntersectionObserver | undefined;
  let disposed = false;
  let contextLost = false;
  let frame = 0;
  let lastTime = 0;
  let elapsed = 0;
  let width = 0;
  let height = 0;
  let visible = false;
  let playing = root.dataset.autoplay !== 'false';
  let reducedMotion = motion.matches;
  let dragging: number | undefined;
  let pointerX = 0;
  let pointerY = 0;
  const manual = { x: 0, y: 0 };
  const hover = { x: 0, y: 0 };

  const cancelFrame = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    root.dataset.rendering = 'false';
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelFrame();
    listeners.abort();
    loading.abort();
    signal?.removeEventListener('abort', dispose);
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    if (dragging !== undefined && stage.hasPointerCapture(dragging)) stage.releasePointerCapture(dragging);
    stage.removeAttribute('tabindex');
    stage.removeAttribute('aria-describedby');
    stage.removeAttribute('aria-keyshortcuts');
    delete root.dataset.dragging;
    delete root.dataset.keyboardFocus;
    root.dataset.ready = 'false';
    if (controls) controls.hidden = true;
    fluidSurface?.dispose();
    fluidSurface = undefined;
    root.dataset.fluidState = 'idle';
    delete root.dataset.fluidFrame;
    pins.forEach(({ element }) => {
      element.dataset.visible = 'false';
      delete element.dataset.screenX;
      delete element.dataset.screenY;
      for (const property of ['left', 'top', '--pin-scale', '--pin-depth-order']) element.style.removeProperty(property);
    });
    disposeAsset(assets);
    assets = [];
    environment?.dispose();
    renderer?.dispose();
    // A fresh canvas also allows this same element to restart after BFcache or a
    // persisted Astro navigation without reusing a deliberately lost context.
    renderer?.forceContextLoss();
    if (canvas.parentNode) canvas.replaceWith(canvas.cloneNode(false));
  };
  signal?.addEventListener('abort', dispose, { once: true });

  try {
    const modelUrl = new URL(root.dataset.modelSrc || '/models/neuraz-mercury.glb', document.baseURI);
    const response = await fetch(modelUrl, { signal: loading.signal });
    if (!response.ok) throw new Error(`Could not load MercuryLogo model (${response.status}).`);
    const data = await response.arrayBuffer();
    if (disposed || signal?.aborted || !root.isConnected) { dispose(); return dispose; }
    const gltf = await new GLTFLoader().parseAsync(data, new URL('.', modelUrl).href);
    if (disposed || signal?.aborted || !root.isConnected) {
      disposeAsset(gltf.scenes);
      dispose();
      return dispose;
    }
    assets = gltf.scenes;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(isometric ? 48 : 40, 1, 0.05, 100);
    if (isometric) camera.up.set(0, 0, 1);
    const pivot = new THREE.Group();
    const centered = new THREE.Group();
    centered.add(gltf.scene);
    const bounds = new THREE.Box3().setFromObject(centered);
    const size = bounds.getSize(new THREE.Vector3());
    if (bounds.isEmpty() || !Number.isFinite(size.length()) || size.length() === 0) throw new Error('MercuryLogo model has no usable geometry.');
    const nativeCenter = bounds.getCenter(new THREE.Vector3());
    gltf.scene.position.sub(nativeCenter);
    const scale = 4 / Math.max(size.x, size.y, size.z);
    centered.scale.setScalar(scale);
    pivot.add(centered);
    scene.add(pivot);
    gltf.scene.traverse(object => {
      object.castShadow = false;
      object.receiveShadow = false;
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const finish = finishParameters(root.dataset.finish);
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach(material => {
        if (!(material instanceof THREE.MeshStandardMaterial)) return;
        material.color.setHex(finish.color);
        material.metalness = finish.metalness;
        material.roughness = finish.roughness;
        if (material instanceof THREE.MeshPhysicalMaterial) {
          material.clearcoat = finish.clearcoat;
          material.clearcoatRoughness = finish.clearcoatRoughness;
          material.specularIntensity = finish.specularIntensity;
        }
      });
    });
    if (root.dataset.finish === 'porcelain') {
      const sources: THREE.Mesh[] = [];
      gltf.scene.traverse(object => { if ((object as THREE.Mesh).isMesh) sources.push(object as THREE.Mesh); });
      for (const mesh of sources) {
        const rim = new THREE.MeshBasicMaterial({ color: 0x090909, side: THREE.BackSide });
        rim.customProgramCacheKey = () => 'neuraz-porcelain-static-rim-v1';
        rim.onBeforeCompile = shader => {
          shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normal * 0.013;');
        };
        mesh.add(new THREE.Mesh(mesh.geometry, rim));
      }
    }

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.AgXToneMapping;
    const matte = root.dataset.finish !== 'mercury';
    const porcelain = root.dataset.finish === 'porcelain';
    renderer.toneMappingExposure = numberOption(root.dataset.exposure, matte ? 1 : 1.1, 0.2, 3);
    renderer.shadowMap.enabled = false;
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    try {
      environment = pmrem.fromScene(room, 0.025, 0.1, 100, { size: 256 });
    } finally {
      room.dispose();
      pmrem.dispose();
    }
    scene.environment = environment.texture;
    scene.environmentIntensity = numberOption(root.dataset.environmentIntensity, porcelain ? 0.8 : matte ? 0.5 : 1.3, 0, 5);
    scene.environmentRotation.set(0, 0.35, 0);
    const key = new THREE.DirectionalLight(matte ? 0xffffff : 0xfff5e9, matte ? 2 : 2.5);
    key.position.set(-3, 4, 6);
    const rim = new THREE.DirectionalLight(matte ? 0xffffff : 0xdfe9ff, matte ? 1 : 1.8);
    rim.position.set(4, 1, 2);
    const fill = new THREE.DirectionalLight(0xffffff, 0.65);
    fill.position.set(-1, -4, 3);
    scene.add(key, rim, fill);
    const pinPosition = new THREE.Vector3();
    const pinScreen = new THREE.Vector3();
    const pinCamera = new THREE.Vector3();
    const projectPins = () => {
      if (!pins.length) return;
      for (const pin of pins) {
        let onSurface = Number.isFinite(pin.u) && Number.isFinite(pin.v) && pin.u >= 0 && pin.u <= 1 && pin.v >= 0 && pin.v <= 1;
        if (onSurface && fluidSurface) onSurface = fluidSurface.sampleTop(pin.u, pin.v, pinPosition);
        else pinPosition.set((pin.u - 0.5) * 5.1, (pin.v - 0.5) * 5.1, pin.top);
        if (!onSurface) { pin.element.dataset.visible = 'false'; continue; }
        pinPosition.z += pin.offset;
        pinPosition.sub(nativeCenter).multiplyScalar(scale).applyMatrix4(pivot.matrixWorld);
        pinCamera.copy(pinPosition).applyMatrix4(camera.matrixWorldInverse);
        pinScreen.copy(pinPosition).project(camera);
        const x = (pinScreen.x * 0.5 + 0.5) * width;
        const y = (-pinScreen.y * 0.5 + 0.5) * height;
        const shown = pinCamera.z < 0 && pinScreen.z >= -1 && pinScreen.z <= 1 && x >= 0 && x <= width && y >= 0 && y <= height;
        pin.element.dataset.visible = String(shown);
        pin.element.dataset.screenX = x.toFixed(2);
        pin.element.dataset.screenY = y.toFixed(2);
        pin.element.style.left = `${x.toFixed(2)}px`;
        pin.element.style.top = `${y.toFixed(2)}px`;
        pin.element.style.setProperty('--pin-scale', THREE.MathUtils.clamp(camera.position.length() / -pinCamera.z, 0.85, 1.15).toFixed(3));
        pin.element.style.setProperty('--pin-depth-order', String(THREE.MathUtils.clamp(1000 + Math.round(pinCamera.z * 20), 1, 999)));
      }
      root.dispatchEvent(new CustomEvent('mercury:project', { detail: { width, height } }));
    };

    const canRender = () => !disposed && !contextLost && !document.hidden && visible && width > 0 && height > 0;
    const autoMotion = () => playing && !reducedMotion;
    const updateControls = () => {
      const active = autoMotion();
      root.dataset.playing = String(active);
      if (toggle) {
        toggle.disabled = reducedMotion;
        toggle.setAttribute('aria-label', active ? 'Pausar movimiento automático' : 'Reanudar movimiento automático');
      }
      if (toggleLabel) toggleLabel.textContent = reducedMotion ? 'Sin movimiento' : active ? 'Pausar' : 'Reanudar';
    };

    const draw = (time: number) => {
      frame = 0;
      if (!canRender() || !renderer) { cancelFrame(); return; }
      const delta = lastTime ? Math.max(0, (time - lastTime) / 1000) : 0;
      const dampingDelta = lastTime ? Math.min(delta, 0.05) : 1 / 60;
      lastTime = time;
      if (autoMotion()) elapsed += delta;
      const phase = reducedMotion ? 0 : elapsed;
      const targetX = manual.x - hover.y * 0.075 + Math.sin(phase * 0.53) * 0.018;
      const targetY = manual.y + hover.x * 0.11 + Math.sin(phase * 0.37) * 0.035;
      const targetZ = Math.sin(phase * 0.29) * 0.007;
      const damping = reducedMotion ? 1 : 1 - Math.exp(-dampingDelta * 10);
      pivot.rotation.x = THREE.MathUtils.lerp(pivot.rotation.x, targetX, damping);
      pivot.rotation.y = THREE.MathUtils.lerp(pivot.rotation.y, targetY, damping);
      pivot.rotation.z = THREE.MathUtils.lerp(pivot.rotation.z, targetZ, damping);
      pivot.position.y = Math.sin(phase * 0.58) * 0.035;
      fluidSurface?.setTime(elapsed - fluidEpoch);
      renderer.render(scene, camera);
      projectPins();
      if (root.dataset.ready !== 'true') {
        root.dataset.ready = 'true';
        root.dataset.state = 'ready';
        if (controls) controls.hidden = false;
        if (interactive) {
          stage.tabIndex = 0;
          if (stage.dataset.mercuryDescription) stage.setAttribute('aria-describedby', stage.dataset.mercuryDescription);
          stage.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown Space R');
        }
        if (status) status.textContent = '';
        root.dispatchEvent(new CustomEvent('mercury:ready'));
      }
      const settling = Math.abs(pivot.rotation.x - targetX) + Math.abs(pivot.rotation.y - targetY) + Math.abs(pivot.rotation.z - targetZ) > 0.0001;
      if (autoMotion() || settling) frame = requestAnimationFrame(draw);
      else { lastTime = 0; root.dataset.rendering = 'false'; }
    };
    const requestDraw = () => {
      if (!frame && canRender()) {
        root.dataset.rendering = 'true';
        frame = requestAnimationFrame(draw);
      }
    };
    const measure = () => {
      if (!renderer || disposed) return;
      const rect = stage.getBoundingClientRect();
      width = Math.round(rect.width);
      height = Math.round(rect.height);
      if (!width || !height) { cancelFrame(); return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Reserve a little space for the outer lobes throughout the drag range.
      const distance = (Math.max(2, 2 / camera.aspect) / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * framing + size.z * scale * 0.5) * 1.03;
      // Rx(-PI/2) lays the native XY logo on XZ. Instead of rotating its data,
      // rotate the maze's original camera/up back into native coordinates.
      camera.position.set(...(isometric ? [10, -13, 13] as const : [0.35, 0.25, 1] as const)).normalize().multiplyScalar(distance);
      camera.far = distance + 30;
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      requestDraw();
    };
    const onVisibility = () => {
      if (document.hidden || !visible) cancelFrame();
      else { lastTime = 0; requestDraw(); }
    };
    const onMotionChange = () => {
      reducedMotion = motion.matches;
      hover.x = hover.y = 0;
      updateControls();
      cancelFrame();
      requestDraw();
    };
    const setPlaying = (next: boolean) => {
      if (next && reducedMotion) return;
      playing = next;
      hover.x = hover.y = 0;
      updateControls();
      requestDraw();
    };
    const onToggle = () => setPlaying(!playing);
    const onReset = () => {
      manual.x = manual.y = hover.x = hover.y = elapsed = 0;
      fluidEpoch = 0;
      fluidSurface?.setTime(0);
      requestDraw();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!interactive || event.button !== 0 || dragging !== undefined || root.dataset.ready !== 'true') return;
      if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea, [data-hero-logo-bubble]')) return;
      dragging = event.pointerId;
      pointerX = event.clientX;
      pointerY = event.clientY;
      hover.x = hover.y = 0;
      delete root.dataset.keyboardFocus;
      stage.setPointerCapture(event.pointerId);
      stage.focus({ preventScroll: true });
      root.dataset.dragging = 'true';
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!interactive) return;
      if (dragging === undefined && event.target instanceof Element && event.target.closest('button, a, input, select, textarea, [data-hero-logo-bubble]')) return;
      if (dragging === event.pointerId) {
        manual.y = THREE.MathUtils.clamp(manual.y + (event.clientX - pointerX) * 0.0045, -0.85, 0.85);
        manual.x = THREE.MathUtils.clamp(manual.x + (event.clientY - pointerY) * 0.0045, -0.6, 0.6);
        pointerX = event.clientX;
        pointerY = event.clientY;
      } else if (dragging === undefined && finePointer.matches && autoMotion()) {
        const rect = stage.getBoundingClientRect();
        hover.x = THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1);
        hover.y = THREE.MathUtils.clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1);
      }
      requestDraw();
    };
    const onPointerEnd = (event: PointerEvent) => {
      if (dragging !== event.pointerId) return;
      dragging = undefined;
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
      delete root.dataset.dragging;
      requestDraw();
    };
    const onPointerLeave = () => {
      hover.x = hover.y = 0;
      requestDraw();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!interactive || event.target !== stage) return;
      root.dataset.keyboardFocus = 'true';
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'r', 'R'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      if (event.key === ' ' && !event.repeat) onToggle();
      else if (event.key.toLowerCase() === 'r') onReset();
      else {
        if (event.key === 'ArrowLeft') manual.y -= 0.08;
        if (event.key === 'ArrowRight') manual.y += 0.08;
        if (event.key === 'ArrowUp') manual.x -= 0.08;
        if (event.key === 'ArrowDown') manual.x += 0.08;
        manual.x = THREE.MathUtils.clamp(manual.x, -0.6, 0.6);
        manual.y = THREE.MathUtils.clamp(manual.y, -0.85, 0.85);
        requestDraw();
      }
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      dispose();
      root.dataset.state = 'error';
      if (status) status.textContent = 'Se muestra la imagen del logo.';
    };
    const eventOptions = { signal: listeners.signal };
    document.addEventListener('visibilitychange', onVisibility, eventOptions);
    window.addEventListener('resize', measure, eventOptions);
    motion.addEventListener('change', onMotionChange, eventOptions);
    canvas.addEventListener('webglcontextlost', onContextLost, eventOptions);
    toggle?.addEventListener('click', onToggle, eventOptions);
    reset?.addEventListener('click', onReset, eventOptions);
    root.addEventListener('mercury:pause', () => setPlaying(false), eventOptions);
    root.addEventListener('mercury:play', () => setPlaying(true), eventOptions);
    root.addEventListener('mercury:reset', onReset, eventOptions);
    if (interactive) {
      stage.addEventListener('pointerdown', onPointerDown, eventOptions);
      stage.addEventListener('pointermove', onPointerMove, eventOptions);
      stage.addEventListener('pointerup', onPointerEnd, eventOptions);
      stage.addEventListener('pointercancel', onPointerEnd, eventOptions);
      stage.addEventListener('lostpointercapture', onPointerEnd, eventOptions);
      stage.addEventListener('pointerleave', onPointerLeave, eventOptions);
      stage.addEventListener('keydown', onKeyDown, eventOptions);
      stage.addEventListener('focus', () => {
        if (dragging === undefined) root.dataset.keyboardFocus = 'true';
      }, eventOptions);
      stage.addEventListener('blur', () => { delete root.dataset.keyboardFocus; }, eventOptions);
    }
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(stage);
    }
    const rect = stage.getBoundingClientRect();
    visible = rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
    if ('IntersectionObserver' in window) {
      visibilityObserver = new IntersectionObserver(entries => {
        visible = entries.some(entry => entry.isIntersecting);
        onVisibility();
      }, { threshold: 0 });
      visibilityObserver.observe(stage);
    } else visible = true;
    updateControls();
    measure();
    if (root.dataset.fluid !== 'false' && !reducedMotion) {
      root.dataset.fluidState = 'loading';
      void loadFluidCache(root, loading.signal).then(({ metadata, buffer }) => {
        if (disposed || reducedMotion || loading.signal.aborted || !root.isConnected) return;
        const surface = createFluidSurface(metadata, buffer, root);
        surface.object.scale.setScalar(scale);
        surface.object.position.copy(nativeCenter).multiplyScalar(-scale);
        fluidSurface = surface;
        pivot.add(surface.object);
        centered.visible = false;
        fluidEpoch = elapsed;
        root.dataset.fluidState = 'ready';
        root.dataset.fluidFrame = '1';
        root.dispatchEvent(new CustomEvent('mercury:fluid-ready', { detail: { frameCount: metadata.frameCount, fps: metadata.fps } }));
        requestDraw();
      }).catch(error => {
        if (disposed || loading.signal.aborted) return;
        root.dataset.fluidState = 'fallback';
        root.dispatchEvent(new CustomEvent('mercury:fluid-error', { detail: { error } }));
      });
    } else root.dataset.fluidState = reducedMotion ? 'reduced-motion' : 'disabled';
    return dispose;
  } catch (error) {
    dispose();
    throw error;
  }
}
