"""Create the metallic mercury render and a compact, upright Three.js GLB."""
import argparse
import json
import math
from pathlib import Path
import sys
import time
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'design/neuraz-metal'
BLEND = OUT / 'neuraz-mercury.blend'
GLB = ROOT / 'public/models/neuraz-mercury.glb'
POSTER = ROOT / 'public/images/neuraz-mercury-poster.png'
NAME = 'NEURAZ | Mercurio metalizado perspectiva'
p = argparse.ArgumentParser()
p.add_argument('--stage', choices=['style', 'preview', 'poster', 'export', 'render'], default='style')
p.add_argument('--frames', default='1,76')
p.add_argument('--resolution', type=int, default=1080)
p.add_argument('--samples', type=int, default=64)
args = p.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'frames').mkdir(exist_ok=True)


def configure():
    s = bpy.context.scene
    s.render.engine = 'BLENDER_EEVEE'
    s.eevee.taa_render_samples = args.samples
    s.eevee.use_raytracing = False
    s.render.resolution_x = s.render.resolution_y = args.resolution
    s.render.resolution_percentage = 100
    s.render.fps = 24
    s.frame_start, s.frame_end = 1, 192
    s.render.use_motion_blur = False
    s.render.use_persistent_data = True
    s.render.image_settings.file_format = 'PNG'
    s.render.image_settings.color_mode = 'RGBA'
    s.render.filepath = '//frames/'


def environment(s):
    import numpy as np
    width, height = 768, 384
    u, v = np.meshgrid(np.linspace(-math.pi, math.pi, width), np.linspace(0, math.pi, height))
    # Soft studio panels: bright windows separated by dark reflection bands.
    radiance = np.full((height, width), .20, dtype=np.float32)
    radiance += .18 * np.clip(np.cos(v), 0, 1)
    for longitude, latitude, sx, sy, intensity in [
        (-1.25, 1.05, .32, .70, 3.4), (.90, 1.20, .20, .65, 2.3),
        (2.85, .65, .75, .23, 1.9), (-.15, .38, .90, .14, 1.3),
    ]:
        dx = np.arctan2(np.sin(u-longitude), np.cos(u-longitude))
        radiance += intensity * np.exp(-((dx/sx)**8 + ((v-latitude)/sy)**8))
    pixels = np.ones((height, width, 4), dtype=np.float32)
    pixels[:, :, :3] = radiance[:, :, None]
    env = bpy.data.images.new('Mercurio | Estudio de reflejos', width=width, height=height, float_buffer=True)
    env.pixels.foreach_set(pixels.ravel())
    env.pack()
    world = bpy.data.worlds.new('Mercurio | Ambiente de estudio')
    s.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    nodes.clear()
    texture = nodes.new('ShaderNodeTexEnvironment')
    texture.image = env
    background = nodes.new('ShaderNodeBackground')
    background.inputs['Strength'].default_value = .7
    output = nodes.new('ShaderNodeOutputWorld')
    world.node_tree.links.new(texture.outputs['Color'], background.inputs['Color'])
    world.node_tree.links.new(background.outputs[0], output.inputs['Surface'])


def style():
    s = bpy.context.scene
    s.name = NAME
    logo = next(o for o in s.objects if o.name.startswith('Neuraz | Aceite negro brillante'))
    logo.name = 'Neuraz | Mercurio metalizado'
    mat = logo.data.materials[0]
    mat.name = 'Neuraz | Mercurio plata pulida'
    shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = (.64, .66, .69, 1.)
    shader.inputs['Metallic'].default_value = 1.
    shader.inputs['Roughness'].default_value = .16
    shader.inputs['Coat Weight'].default_value = 0.
    mat.diffuse_color = (.64, .66, .69, 1.)
    mat.metallic = 1.
    mat.roughness = .16
    camera = s.camera
    camera.name = 'Camara | Mercurio perspectiva'
    camera.data.type = 'PERSP'
    camera.data.lens = 62
    camera.location = (1.8, -2.8, 10.5)
    camera.rotation_euler = (Vector((0., 0., .35)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    for light in (o for o in s.objects if o.type == 'LIGHT'):
        light.data.energy *= .55
    environment(s)
    configure()
    s.render.film_transparent = False
    s['material_finish'] = 'Mercurio metalizado, metalness 1.0, roughness 0.16'
    s['projection'] = 'Perspectiva, lente 62 mm, inclinacion moderada'
    s['render_engine'] = f'Eevee, {args.samples} samples, {args.resolution} x {args.resolution}'
    s['source_animation'] = '../neuraz-aceite/neuraz-aceite-negro.blend'
    s['description'] = 'Animacion de mercurio metalizado en perspectiva. GLB independiente en forma de reposo.'
    s.frame_set(1)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND), compress=True)
    print('METAL_SAVED', str(BLEND), flush=True)


def export_glb():
    s = bpy.context.scene
    s.frame_set(1)
    logo = s.objects['Neuraz | Mercurio metalizado']
    dg = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(logo.evaluated_get(dg))
    obj = bpy.data.objects.new('Neuraz Mercury', mesh)
    s.collection.objects.link(obj)
    obj.rotation_euler.x = math.pi / 2
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    decimate = obj.modifiers.new('Web | Geometria optimizada', 'DECIMATE')
    decimate.ratio = .09
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    for face in obj.data.polygons:
        face.use_smooth = True
    obj['animation_note'] = 'Rest-pose geometry. Fusion motion is supplied separately as SVG and rendered video.'
    bpy.ops.export_scene.gltf(filepath=str(GLB), export_format='GLB', use_selection=True,
                              use_active_scene=True, export_apply=True, export_yup=True,
                              export_animations=False, export_cameras=False, export_lights=False)
    report = {'glb': str(GLB.relative_to(ROOT)), 'bytes': GLB.stat().st_size,
              'vertices': len(obj.data.vertices), 'triangles': len(obj.data.polygons),
              'metalness': 1., 'roughness': .16, 'orientation': 'XY plane, Z depth, centered',
              'native_gltf_animation': False, 'motion_resources': ['AnimatedLogo', 'neuraz-mercury.mp4'],
              'source_blend': str(BLEND.relative_to(ROOT)), 'camera': 'perspective',
              'render_resolution': [args.resolution, args.resolution], 'duration_seconds': 8}
    (OUT / 'asset-info.json').write_text(json.dumps(report, indent=2) + '\n')
    bpy.data.objects.remove(obj, do_unlink=True)
    print('METAL_GLB', json.dumps(report), flush=True)


if args.stage == 'style':
    style()
elif args.stage == 'export':
    export_glb()
elif args.stage in ('preview', 'poster'):
    s = bpy.context.scene
    configure()
    if args.stage == 'poster':
        next(o for o in s.objects if o.name.startswith('Fondo |')).hide_render = True
        s.render.film_transparent = True
    for frame in ([1] if args.stage == 'poster' else map(int, args.frames.split(','))):
        s.frame_set(frame)
        s.render.filepath = str(POSTER if args.stage == 'poster' else OUT / f'preview-{frame:04d}.png')
        before = time.perf_counter()
        bpy.ops.render.render(write_still=True)
        print('METAL_RENDER', frame, round(time.perf_counter()-before, 2), flush=True)
elif args.stage == 'render':
    s = bpy.context.scene
    configure()
    s.render.filepath = str(OUT / 'frames') + '/'
    s.render.use_overwrite = False
    s.render.use_placeholder = False
    bpy.ops.render.render(animation=True)
