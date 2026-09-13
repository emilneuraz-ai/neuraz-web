"""Inflate the six original SVG regions into smooth, closed pillow surfaces.

Requires only NumPy. Uses a cut-cell finite-difference Poisson solve
(-Laplacian(u) = 4, u = 0 on the silhouette), then z = +/-sqrt(u).
Grid cells are clipped at sampled SVG intersections, retaining curved outlines
instead of stair-stepped raster boundaries. Output is consumed by Blender.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import re
import time
import xml.etree.ElementTree as ET

import numpy as np


ROOT = Path(__file__).resolve().parents[1]


def sample_path(data: str, step: float) -> np.ndarray:
    tokens = re.findall(r"[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?", data)
    points = []
    current = np.zeros(2)
    start = None
    i, command = 0, None
    while i < len(tokens):
        if tokens[i].isalpha():
            command = tokens[i]
            i += 1
        if command in ("z", "Z"):
            break
        if command == "M":
            current = np.array([float(tokens[i]), float(tokens[i + 1])])
            start = current.copy()
            points.append(current.copy())
            i += 2
        elif command in ("c", "C"):
            values = np.array([float(v) for v in tokens[i:i + 6]]).reshape(3, 2)
            if command == "c":
                values += current
            c1, c2, end = values
            length = np.linalg.norm(c1 - current) + np.linalg.norm(c2 - c1) + np.linalg.norm(end - c2)
            count = max(4, int(math.ceil(length / step)))
            t = np.linspace(0, 1, count + 1)[1:, None]
            curve = ((1 - t) ** 3 * current + 3 * (1 - t) ** 2 * t * c1
                     + 3 * (1 - t) * t ** 2 * c2 + t ** 3 * end)
            points.extend(curve)
            current = end.copy()
            i += 6
        else:
            raise ValueError(f"Unsupported SVG command: {command}")
    result = np.asarray(points)
    if np.linalg.norm(result[-1] - start) < 1e-10:
        result = result[:-1]
    return result


def make_domain(polygon: np.ndarray, spacing: float):
    low = np.floor(polygon.min(axis=0) / spacing) * spacing - spacing * 2
    high = np.ceil(polygon.max(axis=0) / spacing) * spacing + spacing * 2
    xs = np.arange(low[0], high[0] + spacing * .5, spacing)
    ys = np.arange(low[1], high[1] + spacing * .5, spacing)
    mask = np.zeros((len(ys), len(xs)), dtype=bool)
    horizontal = np.full((len(ys), len(xs) - 1), np.nan)
    vertical = np.full((len(ys) - 1, len(xs)), np.nan)
    a, b = polygon, np.roll(polygon, -1, axis=0)
    for row, y in enumerate(ys):
        crossing = ((a[:, 1] <= y) & (b[:, 1] > y)) | ((b[:, 1] <= y) & (a[:, 1] > y))
        aa, bb = a[crossing], b[crossing]
        values = np.sort(aa[:, 0] + (y - aa[:, 1]) * (bb[:, 0] - aa[:, 0]) / (bb[:, 1] - aa[:, 1]))
        if len(values) % 2:
            raise ValueError("Odd scanline crossings")
        for left, right in values.reshape(-1, 2):
            mask[row] |= (xs > left + 1e-12) & (xs < right - 1e-12)
        cols = np.floor((values - xs[0]) / spacing).astype(int)
        horizontal[row, cols] = values
    for col, x in enumerate(xs):
        crossing = ((a[:, 0] <= x) & (b[:, 0] > x)) | ((b[:, 0] <= x) & (a[:, 0] > x))
        aa, bb = a[crossing], b[crossing]
        values = aa[:, 1] + (x - aa[:, 0]) * (bb[:, 1] - aa[:, 1]) / (bb[:, 0] - aa[:, 0])
        rows = np.floor((values - ys[0]) / spacing).astype(int)
        vertical[rows, col] = values
    return xs, ys, mask, horizontal, vertical


def solve_poisson(xs, ys, mask, horizontal, vertical, tolerance=2e-9, max_iterations=2200):
    h = xs[1] - xs[0]
    ny, nx = mask.shape
    left, right, down, up = [np.full(mask.shape, h) for _ in range(4)]
    cases = (
        (left, mask[:, 1:] & ~mask[:, :-1], xs[1:][None, :] - horizontal, (slice(None), slice(1, None))),
        (right, mask[:, :-1] & ~mask[:, 1:], horizontal - xs[:-1][None, :], (slice(None), slice(None, -1))),
        (down, mask[1:, :] & ~mask[:-1, :], ys[1:, None] - vertical, (slice(1, None), slice(None))),
        (up, mask[:-1, :] & ~mask[1:, :], vertical - ys[:-1, None], (slice(None, -1), slice(None))),
    )
    for distance, selected, crossings, target in cases:
        if np.isnan(crossings[selected]).any():
            raise ValueError("Missing contour/grid crossing")
        distance[target][selected] = np.maximum(crossings[selected], h * 1e-5)
    wl = 2 / (left * (left + right))
    wr = 2 / (right * (left + right))
    wd = 2 / (down * (down + up))
    wu = 2 / (up * (down + up))
    total = wl + wr + wd + wu
    wl, wr, wd, wu = [w / total for w in (wl, wr, wd, wu)]
    rhs = 4 / total
    u = np.zeros((ny, nx), dtype=np.float64)
    yy, xx = np.indices(mask.shape)
    red = mask & ((xx + yy) % 2 == 0)
    black = mask & ~red
    # Boundary zero padding makes all neighbor slices the same shape.
    padded = np.zeros((ny + 2, nx + 2), dtype=np.float64)
    u = padded[1:-1, 1:-1]
    omega = 1.88
    for iteration in range(max_iterations):
        maximum = 0.0
        for selected in (red, black):
            target = (rhs + wl * padded[1:-1, :-2] + wr * padded[1:-1, 2:]
                      + wd * padded[:-2, 1:-1] + wu * padded[2:, 1:-1])
            difference = omega * (target[selected] - u[selected])
            u[selected] += difference
            if iteration % 20 == 0:
                maximum = max(maximum, float(np.max(np.abs(difference))))
        if iteration % 20 == 0 and maximum < tolerance:
            break
    if u[mask].min() <= 0:
        raise ValueError("Poisson solution must be positive inside")
    return u.copy(), iteration + 1, maximum


def clipped_mesh(xs, ys, mask, horizontal, vertical, heights):
    ny, nx = mask.shape
    indices = np.full(mask.shape, -1, dtype=np.int64)
    rows, cols = np.nonzero(mask)
    indices[mask] = np.arange(len(rows))
    vertices = [[float(xs[col]), float(ys[row]), float(heights[row, col])] for row, col in zip(rows, cols)]
    interior_count = len(vertices)
    boundary = {}
    triangles = []

    def crossing(row, col, edge):
        # Cell is counterclockwise: bottom-left, bottom-right, top-right, top-left.
        if edge == 0:
            key = (0, row, col)
            point = (horizontal[row, col], ys[row], 0.)
        elif edge == 1:
            key = (1, row, col + 1)
            point = (xs[col + 1], vertical[row, col + 1], 0.)
        elif edge == 2:
            key = (0, row + 1, col)
            point = (horizontal[row + 1, col], ys[row + 1], 0.)
        else:
            key = (1, row, col)
            point = (xs[col], vertical[row, col], 0.)
        if key not in boundary:
            if not np.isfinite(point).all():
                raise ValueError("Missing boundary vertex")
            boundary[key] = len(vertices)
            vertices.append(point)
        return boundary[key]

    any_inside = mask[:-1, :-1] | mask[:-1, 1:] | mask[1:, 1:] | mask[1:, :-1]
    cell_rows, cell_cols = np.nonzero(any_inside)
    for row, col in zip(cell_rows, cell_cols):
        ids = [indices[row, col], indices[row, col + 1], indices[row + 1, col + 1], indices[row + 1, col]]
        inside = [index >= 0 for index in ids]
        count = sum(inside)
        if count == 4:
            # Alternate diagonals to keep the approximation isotropic.
            if (row + col) % 2:
                triangles.extend(((ids[0], ids[1], ids[3]), (ids[1], ids[2], ids[3])))
            else:
                triangles.extend(((ids[0], ids[1], ids[2]), (ids[0], ids[2], ids[3])))
        elif count == 2 and inside[0] == inside[2]:
            # Rare diagonal cases represent two local clipped corners.
            for corner in range(4):
                if inside[corner]:
                    triangles.append((ids[corner], crossing(row, col, corner), crossing(row, col, (corner - 1) % 4)))
        else:
            clipped = []
            for corner in range(4):
                if inside[corner]:
                    clipped.append(ids[corner])
                if inside[corner] != inside[(corner + 1) % 4]:
                    clipped.append(crossing(row, col, corner))
            for j in range(1, len(clipped) - 1):
                triangles.append((clipped[0], clipped[j], clipped[j + 1]))

    vertices = np.asarray(vertices, dtype=np.float64)
    top = np.asarray(triangles, dtype=np.int64)
    # Mirror only internal vertices; the contour itself is welded, not doubled.
    bottom_vertices = vertices[:interior_count].copy()
    bottom_vertices[:, 2] *= -1
    bottom = top[:, ::-1].copy()
    bottom[bottom < interior_count] += len(vertices)
    all_vertices = np.vstack((vertices, bottom_vertices))
    all_faces = np.vstack((top, bottom))
    directed_edges = np.concatenate((all_faces[:, [0, 1]], all_faces[:, [1, 2]], all_faces[:, [2, 0]]))
    edges = np.sort(directed_edges, axis=1)
    _, inverse, counts = np.unique(edges, axis=0, return_inverse=True, return_counts=True)
    if (counts != 2).any():
        raise ValueError(f"Non-manifold mesh: {int((counts != 2).sum())} bad edges")
    orientation = np.bincount(inverse, weights=np.where(directed_edges[:, 0] < directed_edges[:, 1], 1, -1))
    if (orientation != 0).any():
        raise ValueError("Adjacent faces have inconsistent winding")
    tri = all_vertices[all_faces]
    areas = np.linalg.norm(np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]), axis=1) / 2
    if (areas < 1e-15).any():
        raise ValueError("Degenerate face detected")
    volumes = np.einsum("ij,ij->i", tri[:, 0], np.cross(tri[:, 1], tri[:, 2])) / 6
    if volumes.sum() <= 0:
        raise ValueError("Mesh orientation is inverted")
    return all_vertices.astype(np.float32), all_faces.astype(np.int32), len(boundary)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--resolution", type=int, default=760)
    parser.add_argument("--width", type=float, default=4.8)
    parser.add_argument("--inflation", type=float, default=1.0)
    parser.add_argument("--output", type=Path, default=ROOT / "design/neuraz-logo-3d/inflated-mesh.npz")
    options = parser.parse_args()
    svg = ET.parse(ROOT / "public/images/isotipo.svg")
    polygon_data = [element.attrib["d"] for element in svg.iter() if element.tag.endswith("path")]
    assert len(polygon_data) == 6
    polygons = [sample_path(data, 129 / options.resolution * .35) for data in polygon_data]
    all_points = np.vstack(polygons)
    low, high = all_points.min(axis=0), all_points.max(axis=0)
    center = (low + high) / 2
    scale = options.width / max(high - low)
    polygons = [(p - center) * np.array([scale, -scale]) for p in polygons]
    spacing = options.width / options.resolution
    output = {}
    records = []
    started = time.time()
    for index, polygon in enumerate(polygons):
        piece_start = time.time()
        domain = make_domain(polygon, spacing)
        u, iterations, error = solve_poisson(*domain)
        heights = options.inflation * np.sqrt(np.maximum(u, 0))
        vertices, faces, contour_count = clipped_mesh(*domain, heights)
        output[f"verts_{index}"] = vertices
        output[f"faces_{index}"] = faces
        record = {
            "piece": index, "vertices": len(vertices), "faces": len(faces),
            "contour_vertices": contour_count, "iterations": iterations,
            "height": float(heights.max() * 2), "last_update": error,
            "seconds": round(time.time() - piece_start, 2),
        }
        records.append(record)
        print(json.dumps(record), flush=True)
    metadata = {
        "method": "Poisson -laplacian(u)=4 with exact cut-cell boundary, z=+-sqrt(u)",
        "resolution": options.resolution, "spacing": spacing,
        "inflation": options.inflation, "pieces": records,
        "seconds": round(time.time() - started, 2),
        "source": "public/images/isotipo.svg",
    }
    output["metadata"] = np.array(json.dumps(metadata))
    options.output.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(options.output, **output)
    print(json.dumps({"output": str(options.output), "seconds": metadata["seconds"]}), flush=True)


if __name__ == "__main__":
    main()
