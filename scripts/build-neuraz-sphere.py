"""Independent spherical logo: SVG silhouette intersected with a spherical envelope."""
import bpy, math
from pathlib import Path
from mathutils import Matrix, Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'design/neuraz-sphere'; OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_curve.svg(filepath=str(ROOT/'public/images/isotipo.svg'))
curves=[o for o in bpy.context.scene.objects if o.type=='CURVE']
# SVG importer uses metres at 90 DPI. Preserve the complete SVG viewBox, not just its bounds.
bpy.context.view_layer.update()
bounds=[o.matrix_world@Vector(c) for o in curves for c in o.bound_box]
low=Vector([min(v[i] for v in bounds) for i in range(3)]);high=Vector([max(v[i] for v in bounds) for i in range(3)])
center=(low+high)*.5
scale=2.04/max(high.x-low.x,high.y-low.y)
mat=bpy.data.materials.new('Neuraz black satin');mat.diffuse_color=(.008,.008,.008,1);mat.use_nodes=True
mat.node_tree.nodes.clear()
bs=mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled');output=mat.node_tree.nodes.new('ShaderNodeOutputMaterial');mat.node_tree.links.new(bs.outputs['BSDF'],output.inputs['Surface']);bs.inputs['Base Color'].default_value=(.008,.008,.008,1);bs.inputs['Roughness'].default_value=.48
pieces=[]
for obj in curves:
    obj.data.transform(Matrix.Scale(scale,4)@Matrix.Translation(-center)@obj.matrix_world);obj.matrix_world=Matrix.Identity(4)
    # Imported y is negative down the page.
    obj.location=(0,0,0)
    obj.data.dimensions='2D';obj.data.fill_mode='BOTH';obj.data.extrude=1.2;obj.data.resolution_u=24
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH');obj=bpy.context.object
    bpy.ops.mesh.primitive_uv_sphere_add(segments=128,ring_count=64,radius=1.1)
    cutter=bpy.context.object
    bpy.context.view_layer.objects.active=obj
    boolean=obj.modifiers.new('Spherical envelope','BOOLEAN');boolean.operation='INTERSECT';boolean.object=cutter
    bpy.ops.object.modifier_apply(modifier=boolean.name);bpy.data.objects.remove(cutter,do_unlink=True)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96,ring_count=48,radius=.76)
    inner=bpy.context.object;bpy.context.view_layer.objects.active=obj
    hollow=obj.modifiers.new('Neural shell','BOOLEAN');hollow.operation='DIFFERENCE';hollow.object=inner
    bpy.ops.object.modifier_apply(modifier=hollow.name);bpy.data.objects.remove(inner,do_unlink=True)
    bevel=obj.modifiers.new('Soft neural edges','BEVEL');bevel.width=.04;bevel.segments=8
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    obj.data.materials.clear();obj.data.materials.append(mat)
    for f in obj.data.polygons:f.use_smooth=True
    pieces.append(obj)
bpy.ops.object.select_all(action='DESELECT')
for o in pieces:o.select_set(True)
bpy.ops.mesh.primitive_uv_sphere_add(segments=96,ring_count=64,radius=.99)
core=bpy.context.object;core.name='Light gray neural interior'
gray=mat.copy();gray.name='Light gray interior';gray.diffuse_color=(.6,.6,.6,1)
for node in gray.node_tree.nodes:
    if node.type=='BSDF_PRINCIPLED':node.inputs['Base Color'].default_value=(.6,.6,.6,1)
core.data.materials.append(gray)
for poly in core.data.polygons:poly.use_smooth=True
for o in pieces:o.select_set(True)
core.select_set(True)
bpy.context.view_layer.objects.active=pieces[0];bpy.ops.object.join();brain=bpy.context.object;brain.name='Neuraz spherical neural logo'
assert len(brain.data.vertices)>1000, 'Empty spherical geometry'
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/neuraz-sphere.glb'),export_format='GLB',use_selection=True)
scene=bpy.context.scene;scene.render.use_compositing=False;scene.view_settings.view_transform='Standard';scene.view_settings.exposure=0;scene.view_settings.gamma=1;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.film_transparent=True
bpy.ops.object.camera_add(location=(0,0,4));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=2.65;scene.camera=cam
for pos,power,size in [((-3,4,5),650,4),((3,1,3),400,3)]:
    bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,0,0))-light.location).to_track_quat('-Z','Y').to_euler()
scene.world.color=(.3,.3,.3)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'neuraz-sphere.blend'))
brain.rotation_euler=(.35,.8,0)
scene.render.filepath=str(ROOT/'public/images/neuraz-sphere-poster.png');bpy.ops.render.render(write_still=True)
print('SPHERE_ASSETS_DONE',len(brain.data.vertices),len(brain.data.polygons))
