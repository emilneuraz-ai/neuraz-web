"""Animate the rounded Neuraz mark as merging/retracting matte-black synapses.

Open the rounded .blend in a separate background Blender process, then use
--stage build. The output .blend contains native keyframes and Geometry Nodes;
animation playback needs no Python handler or external geometry cache.
"""

import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import time

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'design' / 'neuraz-sinapsis'
ANCHORS = ROOT / 'design' / 'neuraz-logo-3d' / 'synapse-anchors.json'
BLEND = OUT / 'neuraz-sinapsis-mate.blend'
FPS, PERIOD = 24, 192
NAME = 'NEURAZ | Sinapsis negro mate'
parser = argparse.ArgumentParser()
parser.add_argument('--stage', choices=['build', 'stills', 'render', 'check'], default='build')
parser.add_argument('--frames', default='1,29,64,100,152,192')
parser.add_argument('--resolution', type=int, default=1080)
parser.add_argument('--samples', type=int, default=64)
opts = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'frames').mkdir(exist_ok=True)


def srgb(value):
    rgb = [int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v < .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb) + (1,)


def ease(x):
    x = min(1., max(0., x))
    return x * x * x * (x * (x * 6 - 15) + 10)


def pulse(t, timing):
    start, joined, release, restored = [timing[k] * (8 / 12)
                                       for k in ('start', 'joined', 'release', 'restored')]
    if t < start or t >= restored:
        return 0.
    if t < joined:
        return ease((t - start) / (joined - start))
    if t < release:
        return 1.
    return 1. - ease((t - release) / (restored - release))


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
    blur.inputs['Iterations'].default_value = 3
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
    for obj in pieces:
        mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
        obj.modifiers.clear()
        obj.data = mesh
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
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1)
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
            for bead in range(8):
                obj = bpy.data.objects.new(f'Sinapsis {index + 1:02d} | {half + 1}.{bead + 1:02d}', sphere_mesh)
                controls.objects.link(obj)
                obj.display_type = 'WIRE'
                obj.hide_render = True
                obj.hide_set(True)
                obj['synapse'] = anchor['label']
                controllers.append(obj)
                sample = bead / 7
                for frame in range(1, PERIOD + 2):
                    t = (frame - 1) / FPS
                    growth = pulse(t, anchor['timing_seconds'])
                    fraction = sample * (.5 + .012 / length) * growth
                    u = fraction if half == 0 else 1. - fraction
                    point = start.lerp(end, u)
                    point += side * (.018 * math.sin(math.pi * u) * math.sin(index * 1.7))
                    point.z += .025 * math.sin(math.pi * u) * growth
                    obj.location = point + logo.location
                    radius = max(.0001, (.105 - .033 * sample ** 1.6) * math.sqrt(growth))
                    obj.scale = (radius, radius, radius)
                    obj.keyframe_insert(data_path='location', frame=frame)
                    obj.keyframe_insert(data_path='scale', frame=frame)
    setup_fusion(logo, controls, mat)
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = scene.render.resolution_y = opts.resolution
    scene.render.resolution_percentage = 100
    scene.eevee.taa_render_samples = opts.samples
    scene.eevee.shadow_ray_count = 4
    scene.eevee.shadow_step_count = 8
    scene.eevee.use_raytracing = False
    scene.render.use_motion_blur = False
    scene.render.use_persistent_data = True
    scene.render.fps = FPS
    scene.frame_start, scene.frame_end = 1, PERIOD
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '8'
    scene.render.filepath = str(OUT / 'frames' / '0001.png')
    scene.render.film_transparent = False
    scene.timeline_markers.clear()
    scene.timeline_markers.new('Reposo | Forma original', frame=1)
    for anchor in anchors:
        frame = round(anchor['timing_seconds']['joined'] * 8 / 12 * FPS) + 1
        scene.timeline_markers.new('Conexion | ' + anchor['label'], frame=frame)
    scene.timeline_markers.new('Regreso a reposo', frame=177)
    scene['loop_seconds'] = 8.
    scene['loop_period_frames'] = PERIOD
    scene['description'] = 'Ocho conexiones organicas que se unen y separan; forma original en reposo.'
    scene['material_finish'] = 'Negro mate, roughness 0.70, microtextura sutil'
    scene['source_static_asset'] = '../neuraz-logo-3d/neuraz-logo-3d.blend'
    scene.frame_set(1)
    bpy.ops.object.select_all(action='DESELECT')
    logo.select_set(True)
    bpy.context.view_layer.objects.active = logo
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND), compress=True)
    report = {'blend': str(BLEND), 'duration_seconds': 8, 'fps': FPS, 'frames': PERIOD,
              'resolution': [opts.resolution, opts.resolution], 'synapses': 8,
              'animated_control_objects': len(controllers), 'roughness': .7,
              'metallic': 0., 'voxel_size': .018,
              'default_frame': 1, 'loop_match_frame': PERIOD + 1}
    (OUT / 'animation-info.json').write_text(json.dumps(report, indent=2) + '\n')
    print('SYNAPSE_BUILD', json.dumps(report), flush=True)


def inspect_geometry():
    import numpy as np
    scene = bpy.context.scene
    obj = scene.objects['Neuraz | Mercurio negro mate']
    rows = []
    hashes = {}
    for frame in (1, 29, 64, 100, 152, 177, 193):
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
    assert rows[0]['components'] == 6, 'Rest pose must preserve six separate pieces'
    assert any(row['components'] < 6 for row in rows[1:-2]), 'Synapses never merge the pieces'
    scene.frame_set(1)
    (OUT / 'geometry-checks.json').write_text(json.dumps(rows, indent=2) + '\n')


def render_frames(frames):
    scene = bpy.context.scene
    scene.render.resolution_x = scene.render.resolution_y = opts.resolution
    scene.eevee.taa_render_samples = opts.samples
    for frame in frames:
        path = OUT / 'frames' / f'{frame:04d}.png'
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
elif opts.stage == 'stills':
    render_frames([int(f) for f in opts.frames.split(',')])
elif opts.stage == 'render':
    scene = bpy.context.scene
    scene.render.resolution_x = scene.render.resolution_y = opts.resolution
    scene.eevee.taa_render_samples = opts.samples
    scene.render.filepath = str(OUT / 'frames') + '/'
    scene.render.use_overwrite = False
    scene.render.use_placeholder = False
    bpy.ops.render.render(animation=True)
    scene.frame_set(1)
