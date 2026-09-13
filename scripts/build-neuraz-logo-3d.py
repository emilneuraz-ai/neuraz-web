"""Build the Neuraz SVG as six editable, rounded Blender curves.

Run in Blender's Python console/MCP or with blender --background --python.
Optional injected args: stage='build'|'preview'|'final', resolution, samples.
Only the named asset scene is regenerated; other scenes remain intact.
"""

from pathlib import Path
import json
import sys

import bpy
from mathutils import Matrix, Vector


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'design' / 'neuraz-logo-3d'
SOURCE = ROOT / 'public' / 'images' / 'isotipo.svg'
SCENE_NAME = 'NEURAZ | Logo 3D redondeado'
OPTIONS = globals().get('args', {})
if '--' in sys.argv:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--stage', choices=['build', 'build-preview', 'inflated-build',
                                           'inflated-preview', 'preview', 'final'], default='inflated-build')
    parser.add_argument('--resolution', type=int)
    parser.add_argument('--samples', type=int)
    OPTIONS = {key: value for key, value in vars(parser.parse_args(
        sys.argv[sys.argv.index('--') + 1:])).items() if value is not None}
STAGE = OPTIONS.get('stage', 'inflated-build')
OUT.mkdir(parents=True, exist_ok=True)


def srgb(hex_color):
    values = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4
                 for v in values) + (1.0,)


def material(name, color, roughness, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = srgb(color)
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = srgb(color)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Coat Weight'].default_value = .18 if metallic else 0
    shader.inputs['Coat Roughness'].default_value = .27
    return mat


def aim(obj, target=(0, 0, 0)):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def area_light(scene, name, position, energy, size, color=(1, 1, 1), size_y=None):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy, data.color = energy, color
    data.shape = 'RECTANGLE' if size_y else 'DISK'
    data.size = size
    if size_y:
        data.size_y = size_y
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = position
    aim(obj)
    return obj


def save_asset(scene):
    # Save a normal, directly openable .blend from the dedicated background process.
    # The live session can generate a library without touching its open file.
    if bpy.app.background:
        bpy.context.window.scene = scene
        bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'neuraz-logo-3d.blend'),
                                  copy=True, compress=True)
    else:
        bpy.data.libraries.write(str(OUT / 'neuraz-logo-3d.blend'), {scene},
                                 path_remap='RELATIVE', fake_user=True, compress=True)


def build():
    previous = bpy.data.scenes.get(SCENE_NAME)
    if previous:
        for obj in list(previous.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.scenes.remove(previous)
    scene = bpy.data.scenes.new(SCENE_NAME)
    bpy.context.window.scene = scene
    if bpy.app.background and not bpy.data.filepath:
        for other in list(bpy.data.scenes):
            if other != scene:
                for obj in list(other.objects):
                    bpy.data.objects.remove(obj, do_unlink=True)
                bpy.data.scenes.remove(other)
    scene['source_svg'] = 'public/images/isotipo.svg'
    scene['description'] = 'Seis contornos originales con extrusion y bisel circular editable.'

    bpy.ops.import_curve.svg(filepath=str(SOURCE))
    curves = [obj for obj in scene.objects if obj.type == 'CURVE']
    assert len(curves) == 6, 'The source logo must retain its six separate contours.'
    bpy.context.view_layer.update()
    bounds = [obj.matrix_world @ Vector(corner) for obj in curves for corner in obj.bound_box]
    low = Vector([min(v[i] for v in bounds) for i in range(3)])
    high = Vector([max(v[i] for v in bounds) for i in range(3)])
    center = (low + high) * .5
    scale = 4.8 / max(high.x - low.x, high.y - low.y)
    finish = material('Neuraz | Grafito satinado', '202126', .30, .26)

    for index, obj in enumerate(curves, 1):
        obj.name = f'Neuraz | Pieza {index:02d}'
        obj.data.name = f'Contorno SVG {index:02d} | bisel editable'
        transform = Matrix.Scale(scale, 4) @ Matrix.Translation(-center) @ obj.matrix_world
        obj.data.transform(transform)
        # Curve.transform also scales each control point's radius. Restore it so
        # the round profile uses the intended world-unit radius after SVG scaling.
        for spline in obj.data.splines:
            for point in spline.bezier_points:
                point.radius = 1
            for point in spline.points:
                point.radius = 1
        obj.matrix_world = Matrix.Identity(4)
        obj.location.z = .20
        obj.data.dimensions = '2D'
        obj.data.fill_mode = 'BOTH'
        obj.data.resolution_u = 16
        obj.data.render_resolution_u = 24
        obj.data.extrude = .065
        obj.data.offset = -.030
        obj.data.bevel_depth = .065
        obj.data.bevel_resolution = 8
        obj.data.bevel_mode = 'ROUND'
        obj.data.use_fill_caps = True
        obj.data.materials.clear()
        obj.data.materials.append(finish)
        obj['source_path'] = index
        obj['round_radius'] = .065

    models = curves
    if STAGE.startswith('inflated'):
        import numpy as np
        data = np.load(OUT / 'inflated-mesh.npz')
        reference = bpy.data.collections.new('Referencia | Seis contornos SVG originales')
        scene.collection.children.link(reference)
        models = []
        max_height = max(float(data[f'verts_{i}'][:, 2].max()) for i in range(6))
        for index, curve in enumerate(curves):
            curve.name = f'Referencia | Contorno {index + 1:02d}'
            curve.data.extrude = 0
            curve.data.bevel_depth = 0
            curve.data.offset = 0
            curve.location.z = 0
            for collection in list(curve.users_collection):
                collection.objects.unlink(curve)
            reference.objects.link(curve)
            curve.hide_render = True
            curve.hide_set(True)
            curve.select_set(False)
            mesh = bpy.data.meshes.new(f'Volumen abombado {index + 1:02d}')
            mesh.from_pydata(data[f'verts_{index}'].tolist(), [],
                             data[f'faces_{index}'].tolist())
            mesh.update()
            obj = bpy.data.objects.new(f'Neuraz | Pieza {index + 1:02d}', mesh)
            scene.collection.objects.link(obj)
            obj.location.z = max_height + .055
            obj.data.materials.append(finish)
            for polygon in mesh.polygons:
                polygon.use_smooth = True
            smooth = obj.modifiers.new('Suavizado del contorno', 'SMOOTH')
            smooth.factor = .55
            smooth.iterations = 3
            simplify = obj.modifiers.new('Malla optimizada', 'DECIMATE')
            simplify.ratio = .28
            simplify.use_collapse_triangulate = True
            obj['source_path'] = index + 1
            obj['profile'] = 'Abombado continuo, frente y reverso redondeados'
            models.append(obj)
        reference.hide_render = True
        scene['description'] = 'Seis volumenes abombados continuos sobre la silueta SVG original.'

    floor = material('Estudio | Marfil suave', 'f5f3ef', .7)
    bpy.ops.mesh.primitive_plane_add(size=200)
    ground = bpy.context.object
    ground.name = 'Estudio | Suelo'
    ground.data.materials.append(floor)
    scene.world = bpy.data.worlds.new('Estudio | Ambiente')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes.get('Background').inputs[0].default_value = (.8, .85, 1, 1)
    scene.world.node_tree.nodes.get('Background').inputs[1].default_value = .35
    area_light(scene, 'Luz | Principal suave', (-3.5, 2.5, 6), 680, 4.2,
               (1, .93, .84), 2.6)
    area_light(scene, 'Luz | Borde largo', (4, 1.5, 3.5), 800, 1.6,
               (.82, .90, 1), 5)
    area_light(scene, 'Luz | Relleno frontal', (-1, -4, 5), 220, 5)

    cam_data = bpy.data.cameras.new('Camara | Presentacion')
    cam = bpy.data.objects.new('Camara | Presentacion', cam_data)
    scene.collection.objects.link(cam)
    cam.location = (2.2, -3.5, 12.5)
    aim(cam, (0, 0, .10))
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = 6.15
    cam_data.lens = 52
    scene.camera = cam
    front_data = cam_data.copy()
    front = bpy.data.objects.new('Camara | Frontal', front_data)
    scene.collection.objects.link(front)
    front.location = (0, 0, 13)
    front.rotation_euler = (0, 0, 0)
    front_data.ortho_scale = 5.9

    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 128
    scene.cycles.use_denoising = True
    scene.cycles.adaptive_threshold = .025
    scene.cycles.max_bounces = 6
    scene.render.resolution_x = scene.render.resolution_y = 1800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '8'
    scene.render.film_transparent = False
    scene.view_settings.view_transform = 'AgX'
    scene.render.filepath = str(OUT / 'neuraz-logo-3d.png')
    bpy.ops.object.select_all(action='DESELECT')
    for obj in models:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = models[0]
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                area.spaces.active.region_3d.view_perspective = 'CAMERA'
                area.spaces.active.overlay.show_overlays = False
                area.spaces.active.shading.color_type = 'MATERIAL'

    # glTF requires meshes. The .blend retains the original editable curves.
    depsgraph = bpy.context.evaluated_depsgraph_get()
    meshes = []
    bpy.ops.object.select_all(action='DESELECT')
    for curve in models:
        mesh = bpy.data.meshes.new_from_object(curve.evaluated_get(depsgraph))
        obj = bpy.data.objects.new(curve.name + ' | GLB', mesh)
        scene.collection.objects.link(obj)
        obj.matrix_world = curve.matrix_world.copy()
        # Model is centered in depth; studio elevation belongs only to the scene.
        obj.location.z = 0
        obj.select_set(True)
        meshes.append(obj)
    bpy.ops.export_scene.gltf(filepath=str(OUT / 'neuraz-logo-3d.glb'), export_format='GLB',
                              use_selection=True, use_active_scene=True,
                              export_apply=True, export_yup=True,
                              export_animations=False, export_cameras=False, export_lights=False)
    mesh_counts = {'vertices': sum(len(o.data.vertices) for o in meshes),
                   'polygons': sum(len(o.data.polygons) for o in meshes)}
    for obj in meshes:
        mesh = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.meshes.remove(mesh)
    for obj in models:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = models[0]
    save_asset(scene)
    report = {'source': str(SOURCE), 'pieces': len(curves), 'width_max': 4.8,
              'bevel_radius': .065, 'contour_inset': .030,
              'bevel_segments': 8, 'total_depth': .26,
              'material': 'Grafito satinado', 'mesh': mesh_counts,
              'blend': str(OUT / 'neuraz-logo-3d.blend'),
              'glb': str(OUT / 'neuraz-logo-3d.glb')}
    if STAGE.startswith('inflated'):
        report.update({'profile': 'Abombado continuo, sin cara plana',
                       'max_depth': 2 * max_height, 'source_curves_preserved': True})
        for key in ('bevel_radius', 'contour_inset', 'bevel_segments', 'total_depth'):
            report.pop(key)
    (OUT / 'build-info.json').write_text(json.dumps(report, indent=2) + '\n')
    return report


def render(final=False):
    scene = bpy.data.scenes[SCENE_NAME]
    bpy.context.window.scene = scene
    resolution = OPTIONS.get('resolution', 1800 if final else 900)
    scene.render.resolution_x = scene.render.resolution_y = resolution
    scene.cycles.samples = OPTIONS.get('samples', 128 if final else 32)
    ground = scene.objects['Estudio | Suelo']
    ground.hide_render = False
    scene.render.film_transparent = False
    scene.render.filepath = str(OUT / ('neuraz-logo-3d.png' if final else 'preview.png'))
    bpy.ops.render.render(write_still=True)
    paths = [scene.render.filepath]
    if final:
        ground.hide_render = True
        scene.render.film_transparent = True
        scene.render.filepath = str(OUT / 'neuraz-logo-3d-transparente.png')
        bpy.ops.render.render(write_still=True)
        paths.append(scene.render.filepath)
        ground.hide_render = False
        scene.render.film_transparent = False
        scene.render.filepath = str(OUT / 'neuraz-logo-3d.png')
        save_asset(scene)
    return {'renders': paths, 'resolution': resolution, 'samples': scene.cycles.samples}


if STAGE in ('build', 'build-preview', 'inflated-build', 'inflated-preview'):
    __result__ = build()
    if STAGE in ('build-preview', 'inflated-preview'):
        __result__['preview'] = render()
elif STAGE in ('preview', 'final'):
    __result__ = render(final=STAGE == 'final')
else:
    raise ValueError(f'Unknown stage: {STAGE}')
print(json.dumps(__result__, ensure_ascii=False))
