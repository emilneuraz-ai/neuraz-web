"""Animate the rounded Neuraz mark as thick, merging matte-black mercury.

Open the rounded .blend in a separate background Blender process, then use
--stage build. The output .blend contains native keyframes and Geometry Nodes;
animation playback needs no Python handler or external geometry cache.
"""

import argparse
import hashlib
import json
import math
import random
from pathlib import Path
import sys
import time

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'design' / 'neuraz-mercurio'
ANCHORS = ROOT / 'design' / 'neuraz-logo-3d' / 'synapse-anchors.json'
BLEND = OUT / 'neuraz-mercurio-mate.blend'
CUTS = ROOT / 'design' / 'neuraz-logo-3d' / 'synapse-cuts.json'
FPS, PERIOD = 24, 192
NAME = 'NEURAZ | Mercurio organico negro mate'
parser = argparse.ArgumentParser()
parser.add_argument('--stage', choices=['build', 'stills', 'render', 'check', 'finalize'], default='build')
parser.add_argument('--frames', default='1,29,64,100,152,192')
parser.add_argument('--resolution', type=int, default=1080)
parser.add_argument('--samples', type=int, default=32)
parser.add_argument('--preview', action='store_true')
parser.add_argument('--end', type=int, default=PERIOD)
parser.add_argument('--engine', choices=['eevee', 'cycles'], default='cycles')
opts = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'frames').mkdir(exist_ok=True)
FRAME_DIR = OUT / ('preview-frames' if opts.preview else 'frames')
FRAME_DIR.mkdir(exist_ok=True)


def srgb(value):
    rgb = [int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v < .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb) + (1,)


def ease(x):
    x = min(1., max(0., x))
    return x * x * x * (x * (x * 6 - 15) + 10)


def pulse(t, timing):
    start, joined, release, restored = timing
    if t < start or t >= restored:
        return 0.
    if t < joined:
        return ease((t - start) / (joined - start))
    if t < release:
        return 1.
    return 1. - ease((t - release) / (restored - release))


def event_value(t, events):
    remaining = 1.
    for event in events:
        remaining *= 1. - pulse(t, event)
    return 1. - remaining


def make_events(seed, count=3, cut=False):
    rng = random.Random(seed)
    starts = sorted(rng.uniform(.85, 6.45) for _ in range(count))
    events = []
    for start in starts:
        rise = rng.uniform(.17, .29)
        hold = rng.uniform(.14, .28) if cut else rng.uniform(.13, .30)
        fall = rng.uniform(.22, .36)
        events.append([start, start + rise, start + rise + hold,
                       min(7.55, start + rise + hold + fall)])
    return events


def shape_values(key, events):
    for frame in range(1, PERIOD + 2):
        key.value = event_value((frame - 1) / FPS, events)
        key.keyframe_insert(data_path='value', frame=frame)


def configure_render():
    scene = bpy.context.scene
    scene.render.resolution_x = scene.render.resolution_y = opts.resolution
    if opts.engine == 'cycles':
        scene.render.engine = 'CYCLES'
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for device in prefs.devices:
            device.use = device.type == 'METAL'
        scene.cycles.device = 'GPU'
        scene.cycles.samples = opts.samples
        scene.cycles.use_denoising = True
        scene.cycles.adaptive_threshold = .04
        scene.cycles.max_bounces = 6
    else:
        scene.render.engine = 'BLENDER_EEVEE'
        scene.eevee.taa_render_samples = opts.samples
        scene.eevee.shadow_ray_count = 1 if opts.preview else 2


def animate_base(logo, anchors, bridge_events, cut_data, cut_events):
    import numpy as np
    n = len(logo.data.vertices)
    xyz = np.empty(n * 3, dtype=np.float32)
    logo.data.vertices.foreach_get('co', xyz)
    xyz = xyz.reshape(-1, 3)
    ids = np.empty(n, dtype=np.int32)
    logo.data.attributes['neuraz_piece'].data.foreach_get('value', ids)
    logo.shape_key_add(name='Basis')
    for index, (anchor, events) in enumerate(zip(anchors, bridge_events)):
        target = xyz.copy()
        a, b = np.asarray(anchor['endpoints'], dtype=np.float32)
        direction = b - a
        direction /= np.linalg.norm(direction)
        for endpoint, piece, sign in zip((a, b), anchor['piece_indices'], (1, -1)):
            distance = np.linalg.norm(xyz - endpoint, axis=1)
            weight = np.exp(-((distance / .31) ** 4)) * (ids == piece)
            target += weight[:, None] * direction * (.07 * sign)
        key = logo.shape_key_add(name=f'Atraccion {index + 1:02d} | {anchor["label"]}')
        key.data.foreach_set('co', target.ravel())
        shape_values(key, events)
    for index, (cut, events) in enumerate(zip(cut_data, cut_events)):
        center = np.asarray(cut['center'], dtype=np.float32)
        axis = np.asarray(cut['axis'], dtype=np.float32)
        axis /= np.linalg.norm(axis)
        relative = xyz - center
        axial = relative @ axis
        radial = relative - axial[:, None] * axis
        radius = np.linalg.norm(radial, axis=1)
        cap_radius = float(cut.get('radius', .15))
        half_length = float(cut.get('half_length', .28))
        gap_half = float(cut.get('gap_total', .18)) * .5
        cap_radius = min(cap_radius, half_length - gap_half)
        d = np.clip((np.abs(axial) - gap_half) / cap_radius, 0, 1)
        profile = np.sqrt(np.maximum(0, 2 * d - d * d))
        outer = float(cut.get('radial_limit', .30))
        inner = outer * .78
        radial_weight = 1 - np.clip((radius - inner) / (outer - inner), 0, 1)
        weight = radial_weight * (ids == cut['piece_index']) * (np.abs(axial) < half_length)
        target = xyz - radial * ((1 - profile) * weight)[:, None]
        key = logo.shape_key_add(name=f'Separacion {index + 1:02d} | {cut.get("label", "Rama")}')
        key.data.foreach_set('co', target.ravel())
        shape_values(key, events)


def matte_material():
    mat = bpy.data.materials.new('Neuraz | Negro mate microtexturado')
    mat.use_nodes = True
    mat.diffuse_color = srgb('18191b')
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = next(node for node in nodes if node.type == 'BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = srgb('18191b')
    shader.inputs['Roughness'].default_value = .70
    shader.inputs['Metallic'].default_value = 0.
    shader.inputs['Coat Weight'].default_value = 0.
    shader.inputs['IOR'].default_value = 1.45
    shader.inputs['Specular IOR Level'].default_value = .26
    coords = nodes.new('ShaderNodeTexCoord')
    coords.location = (-720, -140)
    noise = nodes.new('ShaderNodeTexNoise')
    noise.location = (-500, -140)
    noise.inputs['Scale'].default_value = 180
    noise.inputs['Detail'].default_value = 2
    noise.inputs['Roughness'].default_value = .6
    bump = nodes.new('ShaderNodeBump')
    bump.location = (-250, -80)
    bump.inputs['Strength'].default_value = .13
    bump.inputs['Distance'].default_value = .002
    links.new(coords.outputs['Object'], noise.inputs['Vector'])
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], shader.inputs['Normal'])
    return mat


def setup_fusion(logo, controls, mat):
    tree = bpy.data.node_groups.new('Neuraz | Fusion organica de sinapsis', 'GeometryNodeTree')
    tree.interface.new_socket(name='Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    tree.interface.new_socket(name='Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    nodes, links = tree.nodes, tree.links
    entry = nodes.new('NodeGroupInput'); entry.location = (-800, 140)
    collection = nodes.new('GeometryNodeCollectionInfo'); collection.location = (-1000, -140)
    collection.transform_space = 'RELATIVE'
    collection.inputs['Collection'].default_value = controls
    realize = nodes.new('GeometryNodeRealizeInstances'); realize.location = (-780, -120)
    links.new(collection.outputs['Instances'], realize.inputs['Geometry'])
    join = nodes.new('GeometryNodeJoinGeometry'); join.location = (-540, 100)
    links.new(entry.outputs['Geometry'], join.inputs['Geometry'])
    links.new(realize.outputs['Geometry'], join.inputs['Geometry'])
    volume = nodes.new('GeometryNodeMeshToVolume'); volume.location = (-330, 100)
    volume.inputs['Resolution Mode'].default_value = 'Size'
    volume.inputs['Voxel Size'].default_value = .018
    volume.inputs['Density'].default_value = 1.
    volume.inputs['Interior Band Width'].default_value = .03
    links.new(join.outputs['Geometry'], volume.inputs['Mesh'])
    surface = nodes.new('GeometryNodeVolumeToMesh'); surface.location = (-100, 100)
    surface.inputs['Threshold'].default_value = .12
    surface.inputs['Adaptivity'].default_value = 0.
    links.new(volume.outputs['Volume'], surface.inputs['Volume'])
    position = nodes.new('GeometryNodeInputPosition'); position.location = (-80, -250)
    blur = nodes.new('GeometryNodeBlurAttribute'); blur.location = (120, -180)
    blur.data_type = 'FLOAT_VECTOR'
    blur.inputs['Iterations'].default_value = 8
    blur.inputs['Weight'].default_value = 1.
    links.new(position.outputs['Position'], blur.inputs['Value'])
    relax = nodes.new('GeometryNodeSetPosition'); relax.location = (340, 100)
    links.new(surface.outputs['Mesh'], relax.inputs['Geometry'])
    links.new(blur.outputs['Value'], relax.inputs['Position'])
    smooth = nodes.new('GeometryNodeSetShadeSmooth'); smooth.location = (560, 100)
    links.new(relax.outputs['Geometry'], smooth.inputs['Mesh'])
    assign = nodes.new('GeometryNodeSetMaterial'); assign.location = (780, 100)
    assign.inputs['Material'].default_value = mat
    links.new(smooth.outputs['Mesh'], assign.inputs['Geometry'])
    output = nodes.new('NodeGroupOutput'); output.location = (1000, 100)
    links.new(assign.outputs['Geometry'], output.inputs['Geometry'])
    modifier = logo.modifiers.new('Sinapsis | Fusion continua', 'NODES')
    modifier.node_group = tree
    return tree


def build():
    scene = bpy.context.scene
    scene.name = NAME
    pieces = sorted([o for o in scene.objects if o.type == 'MESH' and o.name.startswith('Neuraz | Pieza')],
                    key=lambda o: o.name)
    assert len(pieces) == 6
    dg = bpy.context.evaluated_depsgraph_get()
    for piece_index, obj in enumerate(pieces):
        mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
        obj.modifiers.clear()
        obj.data = mesh
        attribute = mesh.attributes.new('neuraz_piece', 'INT', 'POINT')
        attribute.data.foreach_set('value', [piece_index] * len(mesh.vertices))
    bpy.ops.object.select_all(action='DESELECT')
    for obj in pieces:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = pieces[0]
    bpy.ops.object.join()
    logo = bpy.context.object
    logo.name = 'Neuraz | Mercurio negro mate'
    mat = matte_material()
    logo.data.materials.clear()
    logo.data.materials.append(mat)
    for face in logo.data.polygons:
        face.material_index = 0
        face.use_smooth = True

    controls = bpy.data.collections.new('CONTROL | Brotes de sinapsis animados')
    scene.collection.children.link(controls)
    controls.hide_render = True
    anchor_data = json.loads(ANCHORS.read_text())
    anchors = anchor_data['anchors']
    cut_json = json.loads(CUTS.read_text())
    cuts = cut_json['cuts']
    bridge_events = [make_events(921 + index * 37, 3 + index % 2) for index in range(8)]
    bridge_events[0].insert(0, [.45, .70, .91, 1.18])
    cut_events = [make_events(412 + index * 53, 3, cut=True) for index in range(len(cuts))]
    cut_events[0].insert(0, [.29, .47, .73, 1.04])
    animate_base(logo, anchors, bridge_events, cuts, cut_events)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1)
    template = bpy.context.object
    sphere_mesh = template.data
    sphere_mesh.name = 'Control de fusion | Esfera compartida'
    bpy.data.objects.remove(template, do_unlink=True)
    controllers = []
    for index, anchor in enumerate(anchors):
        start, end = [Vector(v) for v in anchor['endpoints']]
        delta = end - start
        length = delta.length
        side = Vector((-delta.y, delta.x, 0)).normalized()
        for half in range(2):
            for bead in range(10):
                obj = bpy.data.objects.new(f'Sinapsis {index + 1:02d} | {half + 1}.{bead + 1:02d}', sphere_mesh)
                controls.objects.link(obj)
                obj.display_type = 'WIRE'
                obj.hide_render = True
                obj.hide_set(True)
                obj['synapse'] = anchor['label']
                controllers.append(obj)
                sample = bead / 9
                for frame in range(1, PERIOD + 2):
                    t = (frame - 1) / FPS
                    growth = event_value(t, bridge_events[index])
                    fraction = sample * (.5 + .012 / length) * growth
                    u = fraction if half == 0 else 1. - fraction
                    point = start.lerp(end, u)
                    point += side * (.045 * math.sin(math.pi * u) * math.sin(t * 5.2 + index * 1.7) * growth)
                    point.z += .04 * math.sin(math.pi * u) * growth
                    obj.location = point + logo.location
                    # Broad, nearly constant section: merge into the full body,
                    # with only a gentle waist rather than a narrow connector.
                    estimate = cut_json['bridge_endpoint_radii'][index]
                    full_radius = estimate['recommended_full_bridge_radius']
                    shoulder = estimate['recommended_fused_shoulder_radius']
                    radius = max(.0001, (full_radius + (shoulder - full_radius) * (1 - sample) ** 2) * math.sqrt(growth))
                    obj.scale = (radius, radius, radius)
                    obj.keyframe_insert(data_path='location', frame=frame)
                    obj.keyframe_insert(data_path='scale', frame=frame)
    setup_fusion(logo, controls, mat)
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = scene.render.resolution_y = opts.resolution
    scene.render.resolution_percentage = 100
    scene.eevee.taa_render_samples = opts.samples
    scene.eevee.shadow_ray_count = 2
    scene.eevee.shadow_step_count = 8
    scene.eevee.use_raytracing = False
    scene.render.use_motion_blur = False
    scene.render.use_persistent_data = True
    scene.render.fps = FPS
    scene.frame_start, scene.frame_end = 1, PERIOD
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '8'
    scene.render.filepath = '//frames/'
    scene.render.film_transparent = False
    scene.timeline_markers.clear()
    scene.timeline_markers.new('Reposo | Forma original', frame=1)
    for index, events in enumerate(bridge_events):
        frame = round(events[0][1] * FPS) + 1
        scene.timeline_markers.new('Fusion | ' + anchors[index]['label'], frame=frame)
    for index, events in enumerate(cut_events):
        frame = round(events[0][1] * FPS) + 1
        scene.timeline_markers.new('Separacion | ' + cuts[index].get('label', str(index)), frame=frame)
    scene.timeline_markers.new('Regreso a reposo', frame=184)
    scene['loop_seconds'] = 8.
    scene['loop_period_frames'] = PERIOD
    scene['description'] = 'Fusiones anchas y separaciones de ramas originales, con pulsos rapidos e irregulares.'
    scene['material_finish'] = 'Negro mate, roughness 0.70, microtextura sutil'
    scene['source_static_asset'] = '../neuraz-logo-3d/neuraz-logo-3d.blend'
    configure_render()
    scene.frame_set(1)
    bpy.ops.object.select_all(action='DESELECT')
    logo.select_set(True)
    bpy.context.view_layer.objects.active = logo
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND), compress=True)
    report = {'blend': str(BLEND), 'duration_seconds': 8, 'fps': FPS, 'frames': PERIOD,
              'resolution': [opts.resolution, opts.resolution], 'synapses': 8,
              'render_engine': scene.render.engine, 'render_samples': opts.samples,
              'denoising': opts.engine == 'cycles',
              'fusion_control_icosphere_subdivisions': 3,
              'fusion_relaxation_iterations': 8,
              'video': 'neuraz-mercurio-mate.mp4',
              'poster': 'neuraz-mercurio-mate-poster.png',
              'animated_control_objects': len(controllers), 'roughness': .7,
              'metallic': 0., 'voxel_size': .018,
              'original_necks_that_split': len(cuts),
              'bridge_events': bridge_events, 'cut_events': cut_events,
              'default_frame': 1, 'loop_match_frame': PERIOD + 1}
    (OUT / 'animation-info.json').write_text(json.dumps(report, indent=2) + '\n')
    print('SYNAPSE_BUILD', json.dumps({k: v for k, v in report.items()
                                     if k not in ('bridge_events', 'cut_events')}), flush=True)


def inspect_geometry():
    import numpy as np
    scene = bpy.context.scene
    obj = scene.objects['Neuraz | Mercurio negro mate']
    rows = []
    hashes = {}
    for frame in (1, 7, 13, 19, 32, 52, 76, 100, 128, 160, 173, 184, 192, 193):
        scene.frame_set(frame)
        dg = bpy.context.evaluated_depsgraph_get()
        mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
        count = len(mesh.vertices)
        xyz = np.empty(count * 3, dtype=np.float32)
        mesh.vertices.foreach_get('co', xyz)
        digest = hashlib.sha256(xyz.tobytes()).hexdigest()
        hashes[frame] = digest
        # Count connected components: resting mark has six separate components.
        parent = list(range(count))
        def root(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i
        for edge in mesh.edges:
            a, b = map(root, edge.vertices)
            parent[a] = b
        components = len({root(i) for i in range(count)})
        row = {'frame': frame, 'vertices': count, 'faces': len(mesh.polygons),
               'components': components, 'geometry_sha256': digest}
        rows.append(row)
        print('SYNAPSE_GEOMETRY', json.dumps(row), flush=True)
        bpy.data.meshes.remove(mesh)
    assert hashes[1] == hashes[193], 'Loop endpoints differ'
    assert all(hashes[1] == hashes[f] for f in (7, 173, 184, 192)), 'Rest hold differs from original'
    assert rows[0]['components'] == 6, 'Rest pose must preserve six separate pieces'
    assert any(row['components'] < 6 for row in rows[1:-2]), 'Synapses never merge the pieces'
    assert any(row['components'] > 6 for row in rows[1:-2]), 'Original branches never separate'
    scene.frame_set(1)
    (OUT / 'geometry-checks.json').write_text(json.dumps(rows, indent=2) + '\n')


def render_frames(frames):
    scene = bpy.context.scene
    configure_render()
    for frame in frames:
        path = FRAME_DIR / f'{frame:04d}.png'
        if path.exists():
            print('SYNAPSE_SKIP', frame, flush=True)
            continue
        before = time.perf_counter()
        scene.frame_set(frame)
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        print('SYNAPSE_RENDER', frame, round(time.perf_counter() - before, 2), flush=True)
    scene.frame_set(1)


if opts.stage == 'build':
    build()
elif opts.stage == 'check':
    inspect_geometry()
elif opts.stage == 'finalize':
    scene = bpy.context.scene
    configure_render()
    scene.frame_start, scene.frame_end = 1, PERIOD
    scene.frame_set(1)
    scene.render.filepath = '//frames/'
    scene.render.use_overwrite = True
    scene['render_engine'] = f'{scene.render.engine}, {opts.samples} samples, {opts.resolution} x {opts.resolution}'
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND), compress=True)
elif opts.stage == 'stills':
    render_frames([int(f) for f in opts.frames.split(',')])
elif opts.stage == 'render':
    scene = bpy.context.scene
    configure_render()
    scene.frame_end = opts.end
    scene.render.filepath = str(FRAME_DIR) + '/'
    scene.render.use_overwrite = False
    scene.render.use_placeholder = False
    bpy.ops.render.render(animation=True)
    scene.frame_set(1)
