"""Export the evaluated Blender fluid as two native 16-bit height surfaces.

Run inside Blender, with the source .blend already loaded:
  Blender --background design/neuraz-metal/neuraz-mercury.blend \
    --python scripts/export-neuraz-fluid-height.py -- --frames 1-192

No source scene is changed or saved. The CPU rasterizer projects the actual
evaluated triangles onto an inclusive XY grid; it does not infer silhouettes.
"""

from pathlib import Path
import argparse
import gzip
import hashlib
import json
import sys
import time

import bpy
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'models'
CACHE = ROOT / 'design' / 'neuraz-web-assets' / 'height-frames'
RESOLUTION = 192
EXTENT = 5.1
HEIGHT_SCALE = 0.5
FRAME_COUNT = 192
FPS = 24


def parse_frames(value):
    result = []
    for part in value.split(','):
        ends = part.split('-')
        result.extend(range(int(ends[0]), int(ends[-1]) + 1))
    return sorted(set(result))


def rasterize(vertices, indices):
    """Max positive/negative local Z at grid nodes, using exact barycentrics."""
    triangles = vertices[indices]
    grid_xy = (triangles[:, :, :2] + EXTENT / 2) * ((RESOLUTION - 1) / EXTENT)
    lo = np.maximum(np.ceil(grid_xy.min(axis=1)).astype(np.int32), 0)
    hi = np.minimum(np.floor(grid_xy.max(axis=1)).astype(np.int32), RESOLUTION - 1)
    a = grid_xy[:, 0]
    ab = grid_xy[:, 1] - a
    ac = grid_xy[:, 2] - a
    determinant = ab[:, 0] * ac[:, 1] - ab[:, 1] * ac[:, 0]
    useful = (np.abs(determinant) > 1e-10) & np.all(hi >= lo, axis=1)
    lo, hi, a, ab, ac, determinant, triangles = [
        array[useful] for array in (lo, hi, a, ab, ac, determinant, triangles)
    ]
    inverse = 1 / determinant
    size = hi - lo + 1
    top = np.zeros(RESOLUTION * RESOLUTION, np.float32)
    bottom = np.zeros_like(top)
    covered = np.zeros_like(top, dtype=bool)
    sample_count = 0
    for offset_y in range(int(size[:, 1].max())):
        for offset_x in range(int(size[:, 0].max())):
            active = (size[:, 0] > offset_x) & (size[:, 1] > offset_y)
            source = np.flatnonzero(active)
            px = lo[source, 0] + offset_x
            py = lo[source, 1] + offset_y
            dx = px - a[source, 0]
            dy = py - a[source, 1]
            u = (dx * ac[source, 1] - dy * ac[source, 0]) * inverse[source]
            v = (ab[source, 0] * dy - ab[source, 1] * dx) * inverse[source]
            inside = (u >= -1e-6) & (v >= -1e-6) & (u + v <= 1 + 1e-6)
            source, px, py, u, v = [array[inside] for array in (source, px, py, u, v)]
            z = (triangles[source, 0, 2] * (1 - u - v)
                 + triangles[source, 1, 2] * u
                 + triangles[source, 2, 2] * v)
            pixel = py * RESOLUTION + px
            np.maximum.at(top, pixel, z)
            np.maximum.at(bottom, pixel, -z)
            covered[pixel] = True
            sample_count += len(pixel)
    assert max(top.max(), bottom.max()) < HEIGHT_SCALE, 'Height scale clips the geometry'
    quantized = np.rint(np.stack((top, bottom), axis=-1) / HEIGHT_SCALE * 65535).astype('<u2')
    return quantized.reshape(RESOLUTION, RESOLUTION, 2), {
        'coveredGridNodes': int(covered.sum()),
        'triangleSamples': sample_count,
        'maximumTriangleGridSpan': size.max(axis=0).tolist(),
        'maxTop': float(top.max()),
        'maxBottom': float(bottom.max()),
        'uncoveredHeightNodes': int(((top > 0) | (bottom > 0))[~covered].sum()),
    }


def pack_rgba(height):
    """RGBA byte order is top MSB, top LSB, bottom MSB, bottom LSB."""
    packed = np.empty((RESOLUTION, RESOLUTION, 4), np.uint8)
    packed[:, :, 0] = height[:, :, 0] >> 8
    packed[:, :, 1] = height[:, :, 0] & 255
    packed[:, :, 2] = height[:, :, 1] >> 8
    packed[:, :, 3] = height[:, :, 1] & 255
    return packed


def surface_components(height):
    occupied = (height > 0).any(axis=2)
    remaining = set(np.flatnonzero(occupied).tolist())
    sizes = []
    while remaining:
        pending = [remaining.pop()]
        size = 0
        while pending:
            pixel = pending.pop()
            size += 1
            x, y = pixel % RESOLUTION, pixel // RESOLUTION
            neighbors = (pixel - 1 if x > 0 else -1,
                         pixel + 1 if x < RESOLUTION - 1 else -1,
                         pixel - RESOLUTION if y > 0 else -1,
                         pixel + RESOLUTION if y < RESOLUTION - 1 else -1)
            for neighbor in neighbors:
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    pending.append(neighbor)
        sizes.append(size)
    return {'components': len(sizes), 'componentGridNodes': sorted(sizes, reverse=True)}


def publish():
    files = [CACHE / f'{frame:04d}.npy' for frame in range(1, FRAME_COUNT + 1)]
    if not all(path.exists() for path in files):
        print('HEIGHT_CACHE_PARTIAL', sum(path.exists() for path in files), flush=True)
        return
    absolute = np.stack([pack_rgba(np.load(path)) for path in files])
    words = absolute.reshape(FRAME_COUNT, -1).view('<u4')
    delta = words.copy()
    delta[1:] = words[1:] ^ words[:-1]
    raw = delta.tobytes()
    compressed = gzip.compress(raw, compresslevel=9, mtime=0)
    binary_path = OUT / 'neuraz-mercury-fluid.bin.gz'
    binary_path.with_suffix('.gz.tmp').write_bytes(compressed)
    binary_path.with_suffix('.gz.tmp').replace(binary_path)
    metadata = {
        'version': 1,
        'width': RESOLUTION,
        'height': RESOLUTION,
        'resolution': RESOLUTION,
        'frameCount': FRAME_COUNT,
        'fps': FPS,
        'duration': FRAME_COUNT / FPS,
        'worldWidth': EXTENT,
        'bounds': {'xMin': -EXTENT / 2, 'xMax': EXTENT / 2,
                   'yMin': -EXTENT / 2, 'yMax': EXTENT / 2},
        'heightScale': HEIGHT_SCALE,
        'encoding': 'rg-top16-ba-bottom16-xor-delta',
        'compression': 'gzip',
        'rowOrder': 'bottom-to-top',
        'byteOrder': 'little-endian',
        'channels': {'r': 'top-msb', 'g': 'top-lsb', 'b': 'bottom-msb', 'a': 'bottom-lsb'},
        'sampleConvention': 'inclusive-grid',
        'heightCoordinates': 'local-z; top=positive-z, bottom=negative-z-magnitude',
        'source': 'design/neuraz-metal/neuraz-mercury.blend',
        'sourceObject': 'Neuraz | Mercurio metalizado',
        'sourceFrames': [1, FRAME_COUNT],
        'rawByteLength': len(raw),
        'compressedByteLength': len(compressed),
        'sha256': hashlib.sha256(compressed).hexdigest(),
        'dataUrl': '/models/neuraz-mercury-fluid.bin.gz',
        'limitations': 'Two exterior height surfaces sampled from evaluated native geometry; no internal cavities or overhang layers.',
    }
    (OUT / 'neuraz-mercury-fluid.json').write_text(json.dumps(metadata, indent=2) + '\n')
    reconstructed = np.frombuffer(gzip.decompress(compressed), dtype='<u4').reshape(words.shape).copy()
    np.bitwise_xor.accumulate(reconstructed, axis=0, out=reconstructed)
    assert np.array_equal(reconstructed, words), 'The XOR/gzip round trip failed'
    assert np.array_equal(absolute[0], absolute[-1]), 'The loop endpoints differ'
    topology = [{'frame': frame, **surface_components(np.load(CACHE / f'{frame:04d}.npy'))}
                for frame in (1, 13, 19, 76, 192)]
    assert topology[0]['components'] == 6, 'The resting silhouette lost a piece'
    assert topology[1]['components'] > 6, 'The sampled heights lost the terminal separation'
    assert topology[3]['components'] < 6, 'The sampled heights lost the organic fusion'
    report = {
        'sourceBlend': bpy.data.filepath,
        'sourceGeometry': 'Actual evaluated Geometry Nodes mesh, local-space triangles',
        'method': 'CPU barycentric exterior-height rasterization; no image color-keying',
        'frames': FRAME_COUNT,
        'resolution': RESOLUTION,
        'rawBytes': len(raw),
        'compressedBytes': len(compressed),
        'uniqueFrames': len({hashlib.sha256(frame.tobytes()).hexdigest() for frame in absolute}),
        'roundTripExact': True,
        'loopEndpointsExact': True,
        'allFinite': True,
        'quantizationStep': HEIGHT_SCALE / 65535,
        'gridSpacing': EXTENT / (RESOLUTION - 1),
        'topologySamples': topology,
    }
    (CACHE / 'export-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('HEIGHT_PUBLISHED', json.dumps(report), flush=True)


def main():
    arguments = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--frames', default='1-192')
    parser.add_argument('--force', action='store_true')
    options = parser.parse_args(arguments)
    CACHE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    original_frame = scene.frame_current
    obj = scene.objects.get('Neuraz | Mercurio metalizado')
    if obj is None:
        raise RuntimeError('Load the metal .blend before running this exporter')
    started = time.perf_counter()
    for frame in parse_frames(options.frames):
        if not 1 <= frame <= FRAME_COUNT:
            raise ValueError('Frame is outside the 1..192 loop')
        path = CACHE / f'{frame:04d}.npy'
        if path.exists() and not options.force:
            continue
        before = time.perf_counter()
        scene.frame_set(frame)
        depsgraph = bpy.context.evaluated_depsgraph_get()
        mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph))
        try:
            mesh.calc_loop_triangles()
            vertices = np.empty(len(mesh.vertices) * 3, np.float32)
            mesh.vertices.foreach_get('co', vertices)
            vertices = vertices.reshape(-1, 3)
            indices = np.empty(len(mesh.loop_triangles) * 3, np.int32)
            mesh.loop_triangles.foreach_get('vertices', indices)
            indices = indices.reshape(-1, 3)
            assert np.isfinite(vertices).all(), 'Native geometry has non-finite coordinates'
            assert (np.abs(vertices[:, :2]) < EXTENT / 2).all(), 'Grid clips native geometry'
            heights, stats = rasterize(vertices, indices)
            np.save(path, heights, allow_pickle=False)
            stats.update({'frame': frame, 'vertices': len(vertices), 'triangles': len(indices),
                          'seconds': round(time.perf_counter() - before, 3),
                          'nativeBoundsMin': vertices.min(axis=0).tolist(),
                          'nativeBoundsMax': vertices.max(axis=0).tolist()})
            (CACHE / f'{frame:04d}.json').write_text(json.dumps(stats, indent=2) + '\n')
            if frame % 12 == 0 or frame in (1, 13, 19, 76):
                print('HEIGHT_FRAME', json.dumps({key: stats[key] for key in
                      ('frame', 'seconds', 'coveredGridNodes', 'maxTop', 'maxBottom')}), flush=True)
        finally:
            bpy.data.meshes.remove(mesh)
    scene.frame_set(original_frame)
    publish()
    print('HEIGHT_DONE_SECONDS', round(time.perf_counter() - started, 2), flush=True)


if __name__ == '__main__':
    main()
