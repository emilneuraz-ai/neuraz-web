"""Build Neuraz's connected line maze, editable Blender scene and web assets.

Run with Blender in a separate process, never in the user's current scene:
  blender --background --factory-startup --python scripts/build-hero-maze.py
Pass -- --data-only to generate/validate the JSON with standard Python.
"""

from collections import deque
import json
from pathlib import Path
import random
import sys


ROOT = Path(__file__).resolve().parents[1]
SIZE = 9
CELL_SIZE = 1.2
WALL_HEIGHT = 0.32
SEED = 2318
START_CELL = 8 * SIZE + 1
SERVICE_IDS = [
    "automatizacion-flujos", "crm-automatico", "fidelizacion",
    "juegos-marca", "contenido-ia", "agentes-ia",
    "documentacion", "capacitaciones", "dashboards",
]
STOP_CELLS = [64, 67, 70, 43, 40, 37, 10, 13, 16]


def adjacent(cell):
    row, col = divmod(cell, SIZE)
    return [r * SIZE + c for r, c in [
        (row - 1, col), (row, col + 1), (row + 1, col), (row, col - 1)
    ] if 0 <= r < SIZE and 0 <= c < SIZE]


def cell_position(cell):
    row, col = divmod(cell, SIZE)
    return [round((col - (SIZE - 1) / 2) * CELL_SIZE, 4),
            round((row - (SIZE - 1) / 2) * CELL_SIZE, 4)]


def grid_point(col, row):
    return [round((col - SIZE / 2) * CELL_SIZE, 4),
            round((row - SIZE / 2) * CELL_SIZE, 4)]


def shortest_path(neighbors, start, end):
    queue = deque([start])
    parent = {start: None}
    while queue:
        current = queue.popleft()
        if current == end:
            path = []
            while current is not None:
                path.append(current)
                current = parent[current]
            return path[::-1]
        for other in neighbors[current]:
            if other not in parent:
                parent[other] = current
                queue.append(other)
    raise AssertionError(f"Disconnected route: {start} -> {end}")


def build_data():
    rng = random.Random(SEED)
    neighbors = [[] for _ in range(SIZE * SIZE)]
    visited = {START_CELL}
    active = [START_CELL]
    # A seeded growing-tree maze gives real branching paths and open sight lines.
    while active:
        current = active[-1] if rng.random() < 0.35 else rng.choice(active)
        candidates = [cell for cell in adjacent(current) if cell not in visited]
        if not candidates:
            active.remove(current)
            continue
        other = rng.choice(candidates)
        neighbors[current].append(other)
        neighbors[other].append(current)
        visited.add(other)
        active.append(other)

    # Service cells remain traversable destinations, not one-way pockets.
    for cell in STOP_CELLS:
        if len(neighbors[cell]) == 1:
            choices = [other for other in adjacent(cell) if other not in neighbors[cell]]
            other = min(choices, key=lambda item: len(neighbors[item]))
            neighbors[cell].append(other)
            neighbors[other].append(cell)

    walls = []
    for row in range(SIZE + 1):
        for col in range(SIZE):
            if row in [0, SIZE]:
                # An entrance at the front and an exit at the opposite corner.
                if (row == SIZE and col == 1) or (row == 0 and col == 7):
                    continue
                is_wall = True
            else:
                is_wall = row * SIZE + col not in neighbors[(row - 1) * SIZE + col]
            if is_wall:
                walls.append({"a": grid_point(col, row), "b": grid_point(col + 1, row)})
    for col in range(SIZE + 1):
        for row in range(SIZE):
            is_wall = col in [0, SIZE] or row * SIZE + col not in neighbors[row * SIZE + col - 1]
            if is_wall:
                walls.append({"a": grid_point(col, row), "b": grid_point(col, row + 1)})

    cells = []
    for cell, others in enumerate(neighbors):
        x, z = cell_position(cell)
        cells.append({"id": cell, "x": x, "z": z, "neighbors": sorted(others)})
    data = {
        "size": SIZE, "cellSize": CELL_SIZE, "wallHeight": WALL_HEIGHT,
        "cells": cells, "walls": walls, "startCell": START_CELL,
        "stops": [{"serviceId": service, "cell": cell}
                  for service, cell in zip(SERVICE_IDS, STOP_CELLS)],
    }
    validate_data(data)
    path = ROOT / "src/data/hero-maze.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")
    print(f"MAZE_JSON {path} ({len(cells)} cells, {len(walls)} walls)", flush=True)
    return data


def validate_data(data):
    cells = data["cells"]
    neighbors = [cell["neighbors"] for cell in cells]
    assert len(cells) == SIZE * SIZE
    for cell in cells:
        assert cell["id"] in range(SIZE * SIZE)
        for other in cell["neighbors"]:
            assert other in adjacent(cell["id"])
            assert cell["id"] in neighbors[other]
    assert all(shortest_path(neighbors, START_CELL, cell) for cell in range(SIZE * SIZE))
    wall_set = {frozenset((tuple(wall["a"]), tuple(wall["b"]))) for wall in data["walls"]}
    assert len(wall_set) == len(data["walls"])
    for cell in cells:
        row, col = divmod(cell["id"], SIZE)
        for other in adjacent(cell["id"]):
            other_row, other_col = divmod(other, SIZE)
            if other_col != col:
                divider = max(col, other_col)
                shared = frozenset((tuple(grid_point(divider, row)), tuple(grid_point(divider, row + 1))))
            else:
                divider = max(row, other_row)
                shared = frozenset((tuple(grid_point(col, divider)), tuple(grid_point(col + 1, divider))))
            assert (shared in wall_set) == (other not in cell["neighbors"])
    # Also validate every autoplay leg, including returning to the first service.
    route = [START_CELL, *STOP_CELLS, STOP_CELLS[0]]
    lengths = [len(shortest_path(neighbors, a, b)) - 1 for a, b in zip(route, route[1:])]
    print(f"VALIDATION all 81 cells connected; walls match corridors; route lengths {lengths}", flush=True)


def create_blender_scene(data):
    import bpy
    from mathutils import Vector

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"

    def material(name, color, roughness=1):
        mat = bpy.data.materials.new(name)
        mat.diffuse_color = (*color, 1)
        mat.use_nodes = True
        shader = mat.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = (*color, 1)
        shader.inputs["Roughness"].default_value = roughness
        return mat

    # Coordinates in JSON use Three.js x/z, with y upward. Blender x/-y/z
    # exports through glTF's standard Y-up transform to exactly those positions.
    vertices, faces = [], []

    def box(cx, cy, cz, sx, sy, sz):
        offset = len(vertices)
        vertices.extend((cx + dx * sx / 2, cy + dy * sy / 2, cz + dz * sz / 2)
                        for dx, dy, dz in [(-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1),
                                          (-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)])
        faces.extend(tuple(offset + n for n in face) for face in [
            (0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
            (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7),
        ])

    width = 0.025
    endpoints = set()
    for wall in data["walls"]:
        a, b = wall["a"], wall["b"]
        endpoints.update((tuple(a), tuple(b)))
        box((a[0] + b[0]) / 2, -(a[1] + b[1]) / 2, WALL_HEIGHT,
            max(abs(a[0] - b[0]) + width, width),
            max(abs(a[1] - b[1]) + width, width), width)
    for x, z in sorted(endpoints):
        box(x, -z, WALL_HEIGHT / 2, 0.017, 0.017, WALL_HEIGHT)

    mesh = bpy.data.meshes.new("Neuraz_Maze_Rails")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    rails = bpy.data.objects.new("Maze_Rails", mesh)
    scene.collection.objects.link(rails)
    rails.data.materials.append(material("Ink", (0.035, 0.035, 0.04)))
    rails["description"] = "Connected architectural line maze; positions match hero-maze.json"
    rails["cell_size"] = CELL_SIZE
    rails["wall_height"] = WALL_HEIGHT
    rails["seed"] = SEED

    # The floor, lighting, and camera belong to the editable/render scene only.
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.012))
    ground = bpy.context.object
    ground.name = "Render_Only_Paper"
    ground.data.materials.append(material("Paper", (0.95597, 0.95597, 0.95597)))
    ground.hide_select = True
    ground.is_shadow_catcher = True

    world = bpy.data.worlds.new("Paper_Studio")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (1, 1, 1, 1)
    background.inputs["Strength"].default_value = 0.75

    light_data = bpy.data.lights.new("Large_Softbox", "AREA")
    light = bpy.data.objects.new("Large_Softbox", light_data)
    scene.collection.objects.link(light)
    light.location = (-3, -4, 12)
    light_data.energy = 1000
    light_data.shape = "DISK"
    light_data.size = 9

    camera_data = bpy.data.cameras.new("Hero_Orthographic")
    camera = bpy.data.objects.new("Hero_Orthographic", camera_data)
    scene.collection.objects.link(camera)
    camera.location = (10, -13, 13)
    direction = Vector((0, 0, 0.05)) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 16.8
    scene.camera = camera

    scene.render.engine = "CYCLES"
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 850
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1

    # Composite the transparent render and its contact shadows over exact #fafafa.
    # Blender 5.x stores the compositor as an independent node group.
    compositor = bpy.data.node_groups.new("Paper_Backdrop", "CompositorNodeTree")
    scene.compositing_node_group = compositor
    compositor.interface.new_socket(name="Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    render_layer = compositor.nodes.new("CompositorNodeRLayers")
    paper_color = compositor.nodes.new("CompositorNodeRGB")
    paper_color.outputs[0].default_value = (0.955973, 0.955973, 0.955973, 1)
    alpha_over = compositor.nodes.new("CompositorNodeAlphaOver")
    alpha_over.inputs["Factor"].default_value = 1
    output = compositor.nodes.new("NodeGroupOutput")
    compositor.links.new(paper_color.outputs[0], alpha_over.inputs["Background"])
    compositor.links.new(render_layer.outputs["Image"], alpha_over.inputs["Foreground"])
    compositor.links.new(alpha_over.outputs[0], output.inputs[0])

    for name in ["public/models", "public/images", "design"]:
        (ROOT / name).mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    rails.select_set(True)
    bpy.context.view_layer.objects.active = rails
    glb_path = ROOT / "public/models/hero-maze.glb"
    bpy.ops.export_scene.gltf(filepath=str(glb_path), export_format="GLB",
                              use_selection=True, export_yup=True,
                              export_materials="EXPORT", export_normals=True,
                              export_texcoords=False, export_cameras=False,
                              export_lights=False, export_extras=True)
    assert glb_path.stat().st_size < 200_000, f"GLB too large: {glb_path.stat().st_size} bytes"
    print(f"MAZE_GLB {glb_path.stat().st_size} bytes; 1 mesh / 1 material", flush=True)
    scene.render.filepath = str(ROOT / "public/images/hero-maze-poster.png")
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "design/hero-maze.blend"))
    bpy.ops.render.render(write_still=True)
    print("MAZE_COMPLETE", flush=True)


if __name__ == "__main__":
    maze_data = build_data()
    if "--data-only" not in sys.argv:
        create_blender_scene(maze_data)
