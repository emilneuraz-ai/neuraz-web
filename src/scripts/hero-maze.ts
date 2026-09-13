import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import maze from '../data/hero-maze.json';

const RED = 0xe63946;
const ROUTE_Y = 0.075;
const initialTheta = Math.atan2(10, 13);
const initialPhi = Math.acos(13 / Math.sqrt(438));
const READING_SECONDS = 5.4;
const SERVICE_VIEW_OFFSET = Math.PI / 5;

/** Routes follow the same cell graph used to construct the Blender walls. */
function findPath(from: number, to: number): number[] {
  const previous = new Map<number, number | null>([[from, null]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (current === to) break;
    for (const neighbor of maze.cells[current].neighbors) {
      if (!previous.has(neighbor)) {
        previous.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }
  if (!previous.has(to)) throw new Error('Disconnected maze destination');
  const path: number[] = [];
  for (let cell: number | null = to; cell !== null; cell = previous.get(cell)!) path.unshift(cell);
  return path;
}

export async function initHeroMaze(root: HTMLElement): Promise<() => void> {
  const viewport = root.querySelector<HTMLElement>('[data-maze-viewport]')!;
  const canvas = root.querySelector<HTMLCanvasElement>('[data-maze-canvas]')!;
  const link = root.querySelector<HTMLAnchorElement>('[data-maze-link]')!;
  const status = root.querySelector<HTMLElement>('[data-maze-status]')!;
  const bubble = root.querySelector<HTMLElement>('[data-maze-bubble]')!;
  const bubbleLabel = root.querySelector<HTMLElement>('[data-maze-bubble-label]')!;
  const bubbleDetail = root.querySelector<HTMLElement>('[data-maze-bubble-detail]')!;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pins = maze.stops.map(stop => ({
    ...stop,
    element: root.querySelector<HTMLButtonElement>(`[data-maze-stop="${stop.serviceId}"]`)!,
    position: new THREE.Vector3(maze.cells[stop.cell].x, 0.7, maze.cells[stop.cell].z),
    screenX: 0, screenY: 0,
  }));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1.16, 0.1, 80);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0xfafafa, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const resources: (() => void)[] = [];
  let disposed = false;
  let raf = 0;
  let visible = true;
  let width = 1;
  let height = 1;
  let theta = initialTheta;
  let phi = initialPhi;
  let cameraDistance = 17;
  let turn: { from: number; to: number; elapsed: number; duration: number } | null = null;
  let bubbleWidth = 0;
  let bubbleHeight = 0;
  let paused = motion.matches;
  let focusedPin = false;
  let hoveredPin = false;
  let linkHovered = false;
  let manualRoute = false;
  let lastTime = 0;
  let targetIndex = 0;
  let currentCell = maze.startCell;
  let route: THREE.Vector3[] = [];
  let routeCells: number[] = [];
  let segment = 0;
  let progress = 0;
  let routeFinished = false;
  let hold = 0;
  let routeSpeed = 2;
  let drag: { id: number; x: number; y: number; startX: number; startY: number; touch: boolean; active: boolean } | null = null;
  const projected = new THREE.Vector3();
  const cameraSpace = new THREE.Vector3();
  let lineGeometry = new LineGeometry();
  const lineMaterial = new LineMaterial({ color: RED, linewidth: 2.7, depthTest: false, depthWrite: false, transparent: true, opacity: .95 });
  const trail = new Line2(lineGeometry, lineMaterial);
  trail.frustumCulled = false;
  trail.renderOrder = 2;
  scene.add(trail);
  const cursor = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 8), new THREE.MeshBasicMaterial({ color: RED, depthTest: false }));
  cursor.renderOrder = 3;
  scene.add(cursor);
  const halo = new THREE.Mesh(new THREE.RingGeometry(.16, .19, 32), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: .5, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2;
  halo.renderOrder = 3;
  scene.add(halo);

  function listen(target: EventTarget, type: string, listener: EventListener, options?: AddEventListenerOptions) {
    target.addEventListener(type, listener, options);
    resources.push(() => target.removeEventListener(type, listener, options));
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    resources.forEach(cleanup => cleanup());
    scene.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => material.dispose());
      }
    });
    renderer.dispose();
    bubble.hidden = true;
    root.dataset.bubbleOpen = 'false';
    root.dataset.ready = 'false';
    viewport.removeAttribute('tabindex');
  }

  try {
    const model = await new GLTFLoader().loadAsync('/models/hero-maze.glb');
    model.scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        const old = Array.isArray(object.material) ? object.material : [object.material];
        old.forEach(material => material.dispose());
        object.material = new THREE.MeshBasicMaterial({ color: 0x343434 });
      }
    });
    scene.add(model.scene);
    // Keep the real mark as vector geometry. This also avoids platform-dependent
    // rasterization of a viewBox-only SVG when uploading it as a WebGL texture.
    const logoSVG = await new SVGLoader().loadAsync('/images/isotipo.svg');
    for (const path of logoSVG.paths) for (const shape of SVGLoader.createShapes(path)) {
      const geometry = new THREE.ShapeGeometry(shape, 18);
      geometry.translate(-64.5, -65, 0);
      geometry.scale(9.4 / 129, 9.4 / 130, 1);
      geometry.rotateX(Math.PI / 2);
      const logo = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        color: 0xe8e8e8, depthWrite: false, side: THREE.DoubleSide,
      }));
      logo.position.y = -.035;
      logo.renderOrder = -1;
      scene.add(logo);
    }

    function updateCamera() {
      const azimuth = theta;
      const inclination = phi;
      const sinTheta = Math.sin(azimuth), cosTheta = Math.cos(azimuth);
      const sinPhi = Math.sin(inclination), cosPhi = Math.cos(inclination);
      const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov) * .5);
      // Keep every corner in view, including the steeper camera angles.
      cameraDistance = 17;
      for (const x of [-5.42, 5.42]) for (const z of [-5.42, 5.42]) for (const y of [0, .34]) {
        const depth = x * sinPhi * sinTheta + y * cosPhi + z * sinPhi * cosTheta;
        const right = x * cosTheta - z * sinTheta;
        const up = -x * cosPhi * sinTheta + y * sinPhi - z * cosPhi * cosTheta;
        cameraDistance = Math.max(cameraDistance, depth + Math.max(Math.abs(right) / (tangent * camera.aspect * .96), Math.abs(up) / (tangent * .96)));
      }
      camera.position.setFromSphericalCoords(cameraDistance, inclination, azimuth);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
    }
    function faceService(index: number) {
      // Orbit the maze's vertical axis so the destination faces the viewer,
      // slightly to the right, leaving room for its explanation above it.
      const pin = pins[index];
      const bearing = Math.hypot(pin.position.x, pin.position.z) > .1
        ? Math.atan2(pin.position.x, pin.position.z) - SERVICE_VIEW_OFFSET
        : theta + Math.PI / 2;
      const delta = Math.atan2(Math.sin(bearing - theta), Math.cos(bearing - theta));
      turn = Math.abs(delta) < .01 ? null : {
        from: theta,
        to: theta + delta,
        elapsed: 0,
        duration: THREE.MathUtils.clamp(Math.abs(delta) / 1.05, 1.4, 2.8),
      };
      root.dataset.viewState = turn ? 'turning' : 'settled';
    }
    function advanceTurn(dt: number) {
      if (!turn) return;
      turn.elapsed = Math.min(turn.elapsed + dt, turn.duration);
      const t = turn.elapsed / turn.duration;
      const eased = t * t * t * (t * (t * 6 - 15) + 10);
      theta = THREE.MathUtils.lerp(turn.from, turn.to, eased);
      if (t === 1) {
        turn = null;
        if (routeFinished) manualRoute = false;
        root.dataset.viewState = 'settled';
      }
      updateCamera();
    }
    function cancelTurn(state: 'manual' | 'settled') {
      turn = null;
      root.dataset.viewState = state;
      if (routeFinished) {
        manualRoute = false;
        if (bubble.hidden) showBubble();
      }
    }
    function projectPins() {
      for (const pin of pins) {
        projected.copy(pin.position).project(camera);
        const x = (projected.x * .5 + .5) * width;
        const y = (-projected.y * .5 + .5) * height;
        pin.screenX = x;
        pin.screenY = y;
        cameraSpace.copy(pin.position).applyMatrix4(camera.matrixWorldInverse);
        const depth = -cameraSpace.z;
        pin.element.style.setProperty('--pin-scale', THREE.MathUtils.clamp(cameraDistance / depth, .82, 1.2).toFixed(3));
        pin.element.style.transform = `translate(${(x - 22).toFixed(2)}px, ${(y - 22).toFixed(2)}px)`;
        pin.element.style.zIndex = String(Math.round(100 - depth));
      }
      if (!bubble.hidden) {
        const pin = pins[targetIndex];
        if (!bubbleWidth) { bubbleWidth = bubble.offsetWidth; bubbleHeight = bubble.offsetHeight; }
        const left = THREE.MathUtils.clamp(pin.screenX - bubbleWidth * .5, 8, width - bubbleWidth - 8);
        const above = pin.screenY - 28 - bubbleHeight >= 8;
        const top = THREE.MathUtils.clamp(above ? pin.screenY - 28 - bubbleHeight : pin.screenY + 28, 8, height - bubbleHeight - 8);
        bubble.style.left = `${left.toFixed(1)}px`;
        bubble.style.top = `${top.toFixed(1)}px`;
        bubble.dataset.placement = above ? 'above' : 'below';
        bubble.style.setProperty('--arrow-x', `${THREE.MathUtils.clamp(pin.screenX - left, 18, bubbleWidth - 18).toFixed(1)}px`);
      }
    }
    function isRunning() {
      return !disposed && visible && !document.hidden && !paused && !motion.matches && !drag && !linkHovered && (manualRoute || !focusedPin);
    }
    function requestFrame() {
      if (!disposed && visible && !document.hidden && !raf) raf = requestAnimationFrame(frame);
    }
    function syncPause() {
      root.dataset.paused = String(paused);
      lastTime = 0;
      requestFrame();
    }
    function showService(index: number, announce = false) {
      const pin = pins[index];
      link.href = pin.element.dataset.href!;
      pins.forEach(item => item.element.setAttribute('aria-pressed', String(item === pin)));
      if (announce) status.textContent = `${pin.element.dataset.label}. ${pin.element.dataset.detail}`;
    }
    function hideBubble() {
      bubble.hidden = true;
      root.dataset.bubbleOpen = 'false';
    }
    function showBubble() {
      const pin = pins[targetIndex];
      bubbleLabel.textContent = pin.element.dataset.label!;
      bubbleDetail.textContent = pin.element.dataset.explanation!;
      bubble.style.setProperty('--reading-progress', '0');
      bubbleWidth = 0;
      bubble.hidden = false;
      root.dataset.bubbleOpen = 'true';
    }
    function arrive() {
      routeFinished = true;
      manualRoute = manualRoute && !!turn;
      currentCell = pins[targetIndex].cell;
      pins[targetIndex].element.dataset.visited = 'true';
      root.dataset.currentCell = String(currentCell);
      root.dataset.routeState = 'arrived';
      hold = READING_SECONDS;
      showService(targetIndex);
      if (!turn) showBubble();
    }
    function updateTrail() {
      if (route.length < 2) { trail.visible = false; return; }
      trail.visible = true;
      const ends = lineGeometry.getAttribute('instanceEnd') as THREE.InterleavedBufferAttribute;
      for (let i = 0; i < segment; i++) ends.setXYZ(i, route[i + 1].x, ROUTE_Y, route[i + 1].z);
      const index = Math.min(segment, route.length - 2);
      ends.setXYZ(index, cursor.position.x, ROUTE_Y, cursor.position.z);
      ends.data.needsUpdate = true;
      lineGeometry.instanceCount = index + 1;
    }
    function planRoute(index: number, selected = false) {
      hideBubble();
      // If selected mid-corridor, finish that corridor before taking the new BFS path.
      // This preserves a continuous route without crossing the modeled walls.
      const departure = !routeFinished && routeCells.length > 1 ? routeCells[Math.min(segment + 1, routeCells.length - 1)] : currentCell;
      const cells = findPath(departure, pins[index].cell);
      const points = cells.map(id => new THREE.Vector3(maze.cells[id].x, ROUTE_Y, maze.cells[id].z));
      if (cursor.position.distanceTo(points[0]) > .001) {
        points.unshift(cursor.position.clone());
        cells.unshift(currentCell);
      }
      route = points;
      routeCells = cells;
      segment = 0;
      progress = 0;
      targetIndex = index;
      manualRoute = selected;
      routeFinished = false;
      if (!motion.matches && !paused) faceService(index);
      else {
        turn = null;
        root.dataset.viewState = 'settled';
      }
      routeSpeed = Math.max(4.8, (route.length - 1) * maze.cellSize / 2.5);
      lineGeometry.dispose();
      lineGeometry = new LineGeometry();
      lineGeometry.setPositions(route.length > 1 ? route.flatMap(point => point.toArray()) : [...route[0].toArray(), ...route[0].toArray()]);
      trail.geometry = lineGeometry;
      root.dataset.routeState = 'traveling';
      root.dataset.routeTarget = pins[index].serviceId;
      if (selected) {
        showService(index, true);
        showBubble();
        projectPins();
      }
      if (motion.matches || paused || route.length < 2) {
        segment = Math.max(0, route.length - 2);
        cursor.position.copy(route[route.length - 1]);
        updateTrail();
        arrive();
      } else {
        cursor.position.copy(route[0]);
        updateTrail();
      }
      lastTime = 0;
      requestFrame();
    }
    function advance(dt: number) {
      if (routeFinished) {
        // Give every service a stable view and its full reading time, even
        // when the path is shorter than the turn around the maze.
        if (turn) return;
        if (bubble.hidden) showBubble();
        hold -= dt;
        bubble.style.setProperty('--reading-progress', String(Math.min(1, 1 - hold / READING_SECONDS)));
        if (hold <= 0) planRoute((targetIndex + 1) % pins.length);
        return;
      }
      progress += dt * routeSpeed;
      while (segment < route.length - 1) {
        const length = route[segment].distanceTo(route[segment + 1]);
        if (progress < length) break;
        progress -= length;
        currentCell = routeCells[segment + 1];
        segment++;
      }
      if (segment >= route.length - 1) {
        segment = route.length - 2;
        cursor.position.copy(route[route.length - 1]);
        updateTrail();
        arrive();
      } else {
        cursor.position.lerpVectors(route[segment], route[segment + 1], progress / route[segment].distanceTo(route[segment + 1]));
        updateTrail();
      }
    }
    function frame(time: number) {
      raf = 0;
      if (disposed) return;
      const running = isRunning();
      if (running) {
        const dt = lastTime ? Math.min((time - lastTime) / 1000, .05) : 0;
        // A directed turn presents each destination; reading holds stay still.
        if (!hoveredPin || manualRoute || routeFinished) advanceTurn(dt);
        advance(dt);
      }
      lastTime = running ? time : 0;
      halo.position.copy(cursor.position);
      halo.scale.setScalar(running ? 1 + Math.sin(time * .003) * .2 : 1);
      renderScene();
      projectPins();
      if (isRunning()) requestFrame();
    }
    function renderScene() {
      renderer.render(scene, camera);
    }
    function resize() {
      width = viewport.clientWidth;
      height = viewport.clientHeight;
      if (!width || !height) return;
      const aspect = width / height;
      camera.aspect = aspect;
      // Preserve the horizontal framing as the desktop stage gets wider and
      // shorter: the extra width enlarges the maze without adding empty height.
      const referenceAspect = window.matchMedia('(max-width: 767px)').matches ? 1.06 : 1.16;
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(48) * .5) * referenceAspect / aspect));
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      lineMaterial.resolution.set(width, height);
      bubbleWidth = 0;
      updateCamera();
      requestFrame();
    }
    function moveCamera(dx: number, dy: number) {
      cancelTurn('manual');
      theta += dx;
      phi = THREE.MathUtils.clamp(phi + dy, .38, width < 480 ? 1.02 : 1.18);
      updateCamera();
      requestFrame();
    }
    function resetCamera() {
      theta = initialTheta; phi = initialPhi;
      cancelTurn('settled');
      updateCamera(); requestFrame();
    }
    function endDrag() {
      if (drag && viewport.hasPointerCapture(drag.id)) viewport.releasePointerCapture(drag.id);
      drag = null;
      delete root.dataset.dragging;
      lastTime = 0;
      requestFrame();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(viewport);
    resources.push(() => resizeObserver.disconnect());
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      lastTime = 0;
      if (!visible) { cancelAnimationFrame(raf); raf = 0; }
      else requestFrame();
    });
    visibilityObserver.observe(root);
    resources.push(() => visibilityObserver.disconnect());
    listen(document, 'visibilitychange', () => {
      lastTime = 0;
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else requestFrame();
    });
    listen(motion, 'change', () => {
      paused = motion.matches;
      if (motion.matches) cancelTurn('settled');
      syncPause();
    });
    listen(viewport, 'keydown', ((event: KeyboardEvent) => {
      if (event.target !== viewport) return;
      const keys: Record<string, [number, number]> = { ArrowLeft: [-.08, 0], ArrowRight: [.08, 0], ArrowUp: [0, -.05], ArrowDown: [0, .05] };
      if (keys[event.key]) { event.preventDefault(); moveCamera(...keys[event.key]); }
      if (event.key === ' ') {
        event.preventDefault();
        if (!motion.matches) {
          paused = !paused;
          focusedPin = false;
          syncPause();
          status.textContent = paused ? 'Recorrido en pausa.' : 'Recorrido automático reanudado.';
        }
      }
      if (event.key.toLowerCase() === 'r') resetCamera();
    }) as EventListener);
    listen(viewport, 'pointerdown', ((event: PointerEvent) => {
      if (event.button !== 0 || (event.target as Element).closest('button, a, [data-maze-bubble]')) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, touch: event.pointerType === 'touch', active: false };
      if (!drag.touch) viewport.setPointerCapture(event.pointerId);
    }) as EventListener);
    listen(viewport, 'pointermove', ((event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      if (!drag.active && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
      if (drag.touch && !drag.active && Math.abs(event.clientY - drag.startY) > Math.abs(event.clientX - drag.startX)) { endDrag(); return; }
      drag.active = true;
      root.dataset.dragging = 'true';
      viewport.setPointerCapture(event.pointerId);
      moveCamera(-(event.clientX - drag.x) * .008, drag.touch ? 0 : -(event.clientY - drag.y) * .005);
      drag.x = event.clientX;
      drag.y = event.clientY;
    }) as EventListener);
    listen(viewport, 'pointerup', endDrag);
    listen(viewport, 'pointercancel', endDrag);
    listen(viewport, 'lostpointercapture', endDrag);
    // Pointer selection keeps the automatic tour running. Keyboard focus holds
    // the current scene so that moving targets and links remain operable.
    listen(root, 'pointerdown', () => { focusedPin = false; }, { capture: true });
    listen(viewport, 'focusin', () => { focusedPin = !!document.activeElement?.matches(':focus-visible'); });
    listen(viewport, 'focusout', () => {
      queueMicrotask(() => {
        focusedPin = !!document.activeElement?.matches(':focus-visible') && viewport.contains(document.activeElement);
        lastTime = 0;
        requestFrame();
      });
    });
    listen(link, 'pointerenter', () => { linkHovered = true; });
    listen(link, 'pointerleave', () => { linkHovered = false; lastTime = 0; requestFrame(); });
    pins.forEach((pin, index) => {
      listen(pin.element, 'click', () => planRoute(index, true));
      listen(pin.element, 'pointerenter', () => { hoveredPin = true; });
      listen(pin.element, 'pointerleave', () => { hoveredPin = false; lastTime = 0; requestFrame(); });
    });
    listen(canvas, 'webglcontextlost', event => { event.preventDefault(); dispose(); });
    updateCamera();
    resize();
    cursor.position.set(maze.cells[currentCell].x, ROUTE_Y, maze.cells[currentCell].z);
    planRoute(0);
    syncPause();
    renderScene();
    projectPins();
    viewport.tabIndex = 0;
    root.dataset.ready = 'true';
    return dispose;
  } catch (error) {
    dispose();
    throw error;
  }
}
