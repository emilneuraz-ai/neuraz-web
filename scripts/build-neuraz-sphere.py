"""Run build-sphere-mesh.mjs first; exports the rounded spherical surface network."""
import bpy, math
from pathlib import Path
from mathutils import Matrix, Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'design/neuraz-sphere'; OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
mat=bpy.data.materials.new('Neuraz black satin');mat.diffuse_color=(.008,.008,.008,1);mat.use_nodes=True
mat.node_tree.nodes.clear()
bs=mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled');output=mat.node_tree.nodes.new('ShaderNodeOutputMaterial');mat.node_tree.links.new(bs.outputs['BSDF'],output.inputs['Surface']);bs.inputs['Base Color'].default_value=(.008,.008,.008,1);bs.inputs['Roughness'].default_value=.48
import array
coords=array.array('f');coords.frombytes(Path('/tmp/neuraz-sphere-mesh.bin').read_bytes())
verts=list(zip(coords[::3],coords[1::3],coords[2::3]))
mesh=bpy.data.meshes.new('Rounded spherical surface');mesh.from_pydata(verts,[],[(i,i+1,i+2) for i in range(0,len(verts),3)]);mesh.update()
brain=bpy.data.objects.new('Neuraz spherical neural logo',mesh);bpy.context.collection.objects.link(brain)
brain.select_set(True);bpy.context.view_layer.objects.active=brain
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.remove_doubles(threshold=.00001);bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
mesh.materials.append(mat)
white=bpy.data.materials.new('White inner surfaces');white.use_nodes=True;white.node_tree.nodes.clear()
emission=white.node_tree.nodes.new('ShaderNodeEmission');emission.inputs['Color'].default_value=(.956,.956,.956,1)
out=white.node_tree.nodes.new('ShaderNodeOutputMaterial');white.node_tree.links.new(emission.outputs[0],out.inputs['Surface']);mesh.materials.append(white)
for f in mesh.polygons:
    f.use_smooth=True
    f.material_index=1 if f.normal.dot(f.center.normalized()) < -.12 else 0
brain.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/neuraz-sphere.glb'),export_format='GLB',use_selection=True)
scene=bpy.context.scene;scene.render.use_compositing=False;scene.view_settings.view_transform='Standard';scene.view_settings.exposure=0;scene.view_settings.gamma=1;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.film_transparent=True
bpy.ops.object.camera_add(location=(0,0,4));cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=2.65;scene.camera=cam
for pos,power,size in [((-3,4,5),650,4),((3,1,3),400,3)]:
    bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,0,0))-light.location).to_track_quat('-Z','Y').to_euler()
scene.world.color=(.3,.3,.3)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'neuraz-sphere.blend'))
brain.rotation_euler=(0,0,0)
scene.render.filepath=str(ROOT/'public/images/neuraz-sphere-poster.png');bpy.ops.render.render(write_still=True)
print('SPHERE_ASSETS_DONE',len(brain.data.vertices),len(brain.data.polygons))
