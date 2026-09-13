"""Export the native Blender motion as flat vector silhouettes, without rendering.

blender --background design/neuraz-mercurio/neuraz-mercurio-mate.blend \
  --python-exit-code 1 --python scripts/export-animated-logo-svg.py -- --frames all
"""

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys
import time
import xml.etree.ElementTree as ET

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--frames', default='all')
parser.add_argument('--tolerance', type=float, default=.03)
parser.add_argument('--optimize-existing', action='store_true', help='Compact existing paths with Python only; no Blender required')
opts = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
frames = list(range(1, 193)) if opts.frames == 'all' else [int(n) for n in opts.frames.split(',')]
source = ROOT / 'public/images/isotipo.svg'
paths = [el.attrib['d'] for el in ET.parse(source).iter() if el.tag.endswith('path')]
original = ' '.join(re.sub(r'\s+', ' ', d).strip() for d in paths)
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('inflate_neuraz', ROOT / 'scripts/inflate-neuraz-logo.py')
inflater = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inflater)
samples = np.vstack([inflater.sample_path(d, 129 / 760 * .35) for d in paths])
center = (samples.min(0) + samples.max(0)) * .5
scale = 4.8 / max(samples.max(0) - samples.min(0))


def simplify_open(points, tolerance):
    keep = np.zeros(len(points), dtype=bool)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        segment = points[b] - points[a]
        norm = float(segment @ segment)
        between = points[a + 1:b] - points[a]
        projection = np.clip((between @ segment) / norm, 0, 1) if norm else np.zeros(len(between))
        distance = np.linalg.norm(between - projection[:, None] * segment, axis=1)
        index = int(distance.argmax())
        if distance[index] > tolerance:
            pivot = a + index + 1
            keep[pivot] = True
            stack.extend(((a, pivot), (pivot, b)))
    return points[keep]


def simplify_closed(points):
    opposite = int(np.linalg.norm(points - points[0], axis=1).argmax())
    first = simplify_open(points[:opposite + 1], opts.tolerance)
    second = simplify_open(np.vstack((points[opposite:], points[:1])), opts.tolerance)
    return np.vstack((first[:-1], second[:-1]))


def number(value):
    rounded = round(float(value), 2)
    if not rounded:
        return '0'
    text = f'{rounded:.2f}'.rstrip('0').rstrip('.').replace('-0.', '-.')
    return text[1:] if text.startswith('0.') else text


def compact_path(data):
    result = []
    for part in data.split('M')[1:]:
        values = np.asarray([float(value) for value in re.findall(r'[-+]?(?:\d*\.\d+|\d+\.?\d*)', part)]).reshape(-1, 2)
        if 'l' in part:
            values[1:] = values[0] + np.cumsum(values[1:], axis=0)
        # Quantize positions before computing deltas: relative notation must not
        # accumulate rounding drift along the contour.
        quantized = np.rint(values * 100).astype(np.int64)
        delta = np.diff(quantized, axis=0) / 100
        first = quantized[0] / 100
        result.append('M' + number(first[0]) + ',' + number(first[1]) + 'l'
                      + ' '.join(number(x) + ',' + number(y) for x, y in delta) + 'Z')
    return ''.join(result)


def silhouette(mesh, matrix):
    xyz = np.empty(len(mesh.vertices) * 3, dtype=np.float32)
    mesh.vertices.foreach_get('co', xyz)
    xyz = xyz.reshape(-1, 3)
    transform = np.asarray(matrix, dtype=np.float64)
    xyz = xyz @ transform[:3, :3].T + transform[:3, 3]
    mesh.calc_loop_triangles()
    triangles = np.empty(len(mesh.loop_triangles) * 3, dtype=np.int32)
    mesh.loop_triangles.foreach_get('vertices', triangles)
    triangles = triangles.reshape(-1, 3)
    a = xyz[triangles[:, 1], :2] - xyz[triangles[:, 0], :2]
    b = xyz[triangles[:, 2], :2] - xyz[triangles[:, 0], :2]
    triangles = triangles[(a[:, 0] * b[:, 1] - a[:, 1] * b[:, 0]) > 1e-14]
    edges = np.concatenate((triangles[:, [0, 1]], triangles[:, [1, 2]], triangles[:, [2, 0]]))
    keys = np.minimum(edges[:, 0], edges[:, 1]).astype(np.int64) * len(xyz) + np.maximum(edges[:, 0], edges[:, 1])
    _, first, counts = np.unique(keys, return_index=True, return_counts=True)
    boundary = edges[first[counts == 1]]
    following = {}
    for a, b in boundary:
        following.setdefault(int(a), []).append(int(b))
    loops, outer_count = [], 0
    while following:
        start = next(iter(following))
        previous, current, indices = None, start, []
        while True:
            indices.append(current)
            choices = following[current]
            if previous is None or len(choices) == 1:
                next_vertex = choices[0]
            else:
                incoming = xyz[current, :2] - xyz[previous, :2]
                outgoing = xyz[choices, :2] - xyz[current, :2]
                angles = np.arctan2(incoming[0] * outgoing[:, 1] - incoming[1] * outgoing[:, 0], outgoing @ incoming)
                next_vertex = choices[int(angles.argmax())]
            choices.remove(next_vertex)
            if not choices:
                del following[current]
            previous, current = current, next_vertex
            if current == start:
                break
        xy = xyz[indices, :2]
        area = float(np.sum(xy[:, 0] * np.roll(xy[:, 1], -1) - xy[:, 1] * np.roll(xy[:, 0], -1))) * .5
        if abs(area) < 1e-6:
            continue
        svg = np.column_stack((xy[:, 0] / scale + center[0], -xy[:, 1] / scale + center[1]))
        svg = simplify_closed(svg)
        # Nearly edge-on voxel faces can form numerical islands far below a
        # displayed pixel. Their simplified contours have no useful filled area.
        simplified_area = abs(float(np.sum(svg[:, 0] * np.roll(svg[:, 1], -1) - svg[:, 1] * np.roll(svg[:, 0], -1))) * .5)
        if len(svg) < 3 or simplified_area < .01:
            continue
        outer_count += area > 0
        loops.append('M' + 'L'.join(number(x) + ',' + number(y) for x, y in svg) + 'Z')
    return ''.join(loops), int(outer_count), len(loops)


started = time.time()
json_path = ROOT / 'public/models/neuraz-logo-motion.json'
if opts.optimize_existing:
    cached = json.loads(json_path.read_text())
    frames, checks = cached['frameNumbers'], cached['checks']
    output = cached.get('frames') or [cached['paths'][index] for index in cached['timeline']]
    opts.tolerance = cached['simplificationTolerance']
else:
    import bpy
    scene = bpy.context.scene
    logo = next(obj for obj in scene.objects if obj.type == 'MESH' and obj.name.startswith('Neuraz | Mercurio'))
    output, checks = [], []
    for frame in frames:
        tick = time.time()
        scene.frame_set(frame)
        graph = bpy.context.evaluated_depsgraph_get()
        evaluated = logo.evaluated_get(graph)
        mesh = evaluated.to_mesh()
        try:
            d, components, contours = silhouette(mesh, evaluated.matrix_world)
        finally:
            evaluated.to_mesh_clear()
        # The original SVG is only the no-JS/reduced-motion fallback.
        at_rest = all(abs(key.value) < 1e-7 for key in logo.data.shape_keys.key_blocks[1:])
        output.append(d)
        record = {'frame': frame, 'components': components, 'contours': contours, 'rest': at_rest,
                  'characters': len(d), 'seconds': round(time.time() - tick, 3)}
        checks.append(record)
        print(json.dumps(record), flush=True)

output = [compact_path(d) for d in output]
if frames != list(range(1, 193)):
    print(json.dumps({'validated_frames': frames, 'published': False, 'note': 'Pilot checks never replace the complete public animation'}), flush=True)
    raise SystemExit(0)
unique = list(dict.fromkeys(output))
indices = {d: index for index, d in enumerate(unique)}
timeline = [indices[d] for d in output]

payload = {'version': 1, 'viewBox': [0, 0, 129, 130], 'fps': 24, 'duration': 8,
           'frameNumbers': frames, 'frameCount': len(frames), 'paths': unique, 'timeline': timeline,
           'restPath': original, 'fillRule': 'evenodd',
           'source': 'Native animated Blender mesh projected along +Z; no rasterization',
           'sourceSvgSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
           'simplificationTolerance': opts.tolerance, 'checks': checks}
json_path.parent.mkdir(parents=True, exist_ok=True)
temporary_json = json_path.with_name('.' + json_path.name + '.tmp')
temporary_json.write_text(json.dumps(payload, separators=(',', ':')) + '\n')
temporary_json.replace(json_path)
if frames == list(range(1, 193)):
    values = ';'.join(output + [output[0]])
    key_times = ';'.join(f'{i / 192:.8f}'.rstrip('0').rstrip('.') or '0' for i in range(193))
    standalone = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 129 130" role="img" aria-labelledby="title">
<title id="title">Neuraz: conexiones que se unen y se separan</title>
<style>.animated{{display:block}}.rest{{display:none}}@media(prefers-reduced-motion:reduce){{.animated{{display:none}}.rest{{display:block}}}}</style>
<path class="rest" fill="#000" fill-rule="evenodd" d="{original}"/>
<path class="animated" fill="#000" fill-rule="evenodd" d="{output[0]}"><animate attributeName="d" calcMode="discrete" dur="8s" repeatCount="indefinite" values="{values}" keyTimes="{key_times}"/></path>
</svg>\n'''
    svg_path = ROOT / 'public/images/neuraz-logo-animated.svg'
    temporary_svg = svg_path.with_name('.' + svg_path.name + '.tmp')
    temporary_svg.write_text(standalone)
    temporary_svg.replace(svg_path)
print(json.dumps({'output': str(json_path), 'frames': len(frames), 'seconds': round(time.time() - started, 2)}), flush=True)
