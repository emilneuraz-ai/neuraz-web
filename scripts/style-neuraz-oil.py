"""Restyle the native mercury loop as glossy black oil, front-on and shadowless."""
import argparse
import json
from pathlib import Path
import sys
import time

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'design' / 'neuraz-aceite'
BLEND = OUT / 'neuraz-aceite-negro.blend'
NAME = 'NEURAZ | Aceite negro brillante frontal'
parser = argparse.ArgumentParser()
parser.add_argument('--stage', choices=['style', 'preview', 'render', 'check'], default='style')
parser.add_argument('--frames', default='1,76')
parser.add_argument('--resolution', type=int, default=1080)
parser.add_argument('--samples', type=int, default=64)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'frames').mkdir(exist_ok=True)


def srgb(hex_value):
    c = [int(hex_value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v < .04045 else ((v + .055) / 1.055) ** 2.4 for v in c) + (1,)


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
    s.render.image_settings.color_depth = '8'
    s.render.film_transparent = False
    s.render.filepath = '//frames/'


def style():
    s = bpy.context.scene
    s.name = NAME
    logo = next(o for o in s.objects if o.name.startswith('Neuraz | Mercurio negro mate'))
    logo.name = 'Neuraz | Aceite negro brillante'
    mat = logo.data.materials[0]
    mat.name = 'Neuraz | Aceite negro pulido'
    mat.diffuse_color = srgb('060708')
    n = mat.node_tree.nodes
    n.clear()
    shader = n.new('ShaderNodeBsdfPrincipled')
    shader.name = 'Aceite | Negro brillante'
    shader.inputs['Base Color'].default_value = srgb('060708')
    shader.inputs['Metallic'].default_value = 0.
    shader.inputs['Roughness'].default_value = .12
    shader.inputs['IOR'].default_value = 1.48
    shader.inputs['Specular IOR Level'].default_value = .5
    shader.inputs['Coat Weight'].default_value = .60
    shader.inputs['Coat Roughness'].default_value = .065
    shader.inputs['Coat IOR'].default_value = 1.46
    output = n.new('ShaderNodeOutputMaterial')
    output.location = (360, 0)
    mat.node_tree.links.new(shader.outputs['BSDF'], output.inputs['Surface'])

    # An unlit backdrop cannot receive shadows or ambient occlusion.
    floor = next(o for o in s.objects if o.name.startswith('Estudio | Suelo'))
    floor.name = 'Fondo | Gris claro uniforme sin sombras'
    background = bpy.data.materials.new('Fondo | Emision uniforme')
    background.use_nodes = True
    bn = background.node_tree.nodes
    bn.clear()
    emission = bn.new('ShaderNodeEmission')
    emission.inputs['Color'].default_value = (1., 1., 1., 1.)
    emission.inputs['Strength'].default_value = 2.5
    output = bn.new('ShaderNodeOutputMaterial')
    background.node_tree.links.new(emission.outputs[0], output.inputs['Surface'])
    floor.data.materials.clear()
    floor.data.materials.append(background)
    for obj in s.objects:
        obj.visible_shadow = False
    # The backdrop is visible only to the camera when using a ray renderer.
    floor.visible_glossy = False
    floor.visible_diffuse = False

    camera = next(o for o in s.objects if o.name.startswith('Camara | Frontal'))
    s.camera = camera
    camera.data.type = 'ORTHO'
    camera.location = (0., 0., 13.)
    camera.rotation_euler = (0., 0., 0.)
    camera.data.ortho_scale = 5.8
    camera.data.shift_x = camera.data.shift_y = 0.
    camera.data.dof.use_dof = False

    lights = [o for o in s.objects if o.type == 'LIGHT']
    for obj in lights:
        bpy.data.objects.remove(obj, do_unlink=True)
    for name, pos, energy, width, height in [
        ('Luz | Reflejo principal de aceite', (-3.8, 1.8, 6.), 750., 1.5, 5.5),
        ('Luz | Reflejo lateral fino', (4., .7, 4.), 500., .65, 4.),
        ('Luz | Brillo inferior suave', (-.5, -4.5, 6.), 180., 3.5, 1.0),
    ]:
        light = bpy.data.lights.new(name, 'AREA')
        light.energy = energy
        light.color = (1., 1., 1.)
        light.shape = 'RECTANGLE'
        light.size, light.size_y = width, height
        light.use_shadow = False
        obj = bpy.data.objects.new(name, light)
        s.collection.objects.link(obj)
        obj.visible_shadow = False
        obj.location = pos
        obj.rotation_euler = (Vector((0., 0., .4)) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    world = s.world
    world.name = 'Ambiente | Oscuro para reflejos de aceite'
    wn = world.node_tree.nodes
    bg = next(n for n in wn if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (.08, .08, .08, 1.)
    bg.inputs['Strength'].default_value = .12
    configure()
    s.frame_set(1)
    s['material_finish'] = 'Negro brillante estilo aceite, roughness 0.12, coat 0.60'
    s['render_engine'] = f'Eevee, {args.samples} samples, {args.resolution} x {args.resolution}'
    s['projection'] = 'Ortografica frontal, sin inclinacion ni perspectiva'
    s['shadows'] = 'Desactivadas, fondo uniforme de emision'
    s['source_animation'] = '../neuraz-mercurio/neuraz-mercurio-mate.blend'
    s['description'] = 'Animacion de fusiones y desprendimientos conservada; acabado aceite negro brillante.'
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND), compress=True)
    check()


def check():
    s = bpy.context.scene
    logo = next(o for o in s.objects if o.name.startswith('Neuraz | Aceite negro brillante'))
    shader = next(n for n in logo.data.materials[0].node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    assert s.camera.data.type == 'ORTHO'
    assert all(abs(v) < 1e-7 for v in s.camera.rotation_euler)
    assert all(not o.data.use_shadow for o in s.objects if o.type == 'LIGHT')
    assert all(not o.visible_shadow for o in s.objects)
    assert len(logo.data.shape_keys.key_blocks) == 13
    report = {
        'scene': s.name, 'blend': BLEND.name,
        'projection': s.camera.data.type, 'camera_rotation': list(s.camera.rotation_euler),
        'camera_location': list(s.camera.location), 'ortho_scale': s.camera.data.ortho_scale,
        'all_light_shadows_disabled': True, 'all_object_shadows_disabled': True,
        'background': 'uniform unlit emission', 'roughness': shader.inputs['Roughness'].default_value,
        'coat_weight': shader.inputs['Coat Weight'].default_value,
        'shape_keys_preserved': len(logo.data.shape_keys.key_blocks),
        'frames': 192, 'fps': 24, 'duration_seconds': 8,
        'resolution': [s.render.resolution_x, s.render.resolution_y],
        'engine': s.render.engine, 'samples': s.eevee.taa_render_samples,
    }
    (OUT / 'scene-checks.json').write_text(json.dumps(report, indent=2) + '\n')
    print('OIL_SCENE', json.dumps(report), flush=True)


if args.stage == 'style':
    style()
elif args.stage == 'check':
    check()
elif args.stage == 'preview':
    configure()
    for frame in map(int, args.frames.split(',')):
        s = bpy.context.scene
        s.frame_set(frame)
        s.render.filepath = str(OUT / f'preview-{frame:04d}.png')
        before = time.perf_counter()
        bpy.ops.render.render(write_still=True)
        print('OIL_PREVIEW', frame, round(time.perf_counter() - before, 2), flush=True)
elif args.stage == 'render':
    configure()
    s = bpy.context.scene
    s.render.filepath = str(OUT / 'frames') + '/'
    s.render.use_overwrite = False
    s.render.use_placeholder = False
    bpy.ops.render.render(animation=True)
