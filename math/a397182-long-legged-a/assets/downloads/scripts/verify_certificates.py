#!/usr/bin/env python3
"""Exact verification of the rational A397182 certificates for 4 <= n <= 16.

Only the Python standard library is used.  Every geometric sign decision is
performed with fractions.Fraction; no floating-point arithmetic or solver
state is involved.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from itertools import combinations
from pathlib import Path
from typing import Any, Iterable, NamedTuple

ROOT = Path(__file__).resolve().parents[1]
CERTIFICATES = {n: ROOT / "certificates" / f"n{n:02d}.json" for n in range(4, 17)}

Point = tuple[Fraction, Fraction]
Vector = tuple[Fraction, Fraction]


class Component(NamedTuple):
    origin: Point
    direction: Vector
    bounded: bool
    upper: Fraction | None


def add(a: Point, b: Vector) -> Point:
    return a[0] + b[0], a[1] + b[1]


def sub(a: Point, b: Point) -> Vector:
    return a[0] - b[0], a[1] - b[1]


def scale(value: Fraction, vector: Vector) -> Vector:
    return value * vector[0], value * vector[1]


def det(a: Vector, b: Vector) -> Fraction:
    return a[0] * b[1] - a[1] * b[0]


def encoded_fraction(value: Any) -> Fraction:
    if isinstance(value, dict):
        return Fraction(value["numerator"], value["denominator"])
    return Fraction(value)


def unit_from_half_angle(t: Fraction) -> Vector:
    denominator = 1 + t * t
    return (1 - t * t) / denominator, 2 * t / denominator


def parse_shapes(path: Path, n: int) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    document = json.loads(path.read_text())
    if n == 4:
        shapes = []
        for row in document["shapes"]:
            t1 = encoded_fraction(row["half_angle_t1"])
            t2 = encoded_fraction(row["half_angle_t2"])
            shapes.append(
                {
                    "apex": (encoded_fraction(row["x"]), encoded_fraction(row["y"])),
                    "radius": encoded_fraction(row["radius"]),
                    "u": unit_from_half_angle(t1),
                    "v": unit_from_half_angle(t2),
                }
            )
    else:
        shapes = [
            {
                "apex": tuple(Fraction(value) for value in row["apex"]),
                "radius": Fraction(row["radius"]),
                "u": tuple(Fraction(value) for value in row["u"]),
                "v": tuple(Fraction(value) for value in row["v"]),
            }
            for row in document["shapes"]
        ]
    return document, shapes


def components(shape: dict[str, Any]) -> tuple[Component, Component, Component]:
    apex = shape["apex"]
    radius = shape["radius"]
    u = shape["u"]
    v = shape["v"]
    return (
        Component(apex, u, False, None),
        Component(apex, v, False, None),
        Component(add(apex, scale(radius, u)), sub(v, u), True, radius),
    )


def vertices(shape: dict[str, Any]) -> tuple[Point, Point, Point]:
    apex = shape["apex"]
    radius = shape["radius"]
    return (
        apex,
        add(apex, scale(radius, shape["u"])),
        add(apex, scale(radius, shape["v"])),
    )


def line_parameter(point: Point, component: Component) -> Fraction | None:
    delta = sub(point, component.origin)
    if det(delta, component.direction) != 0:
        return None
    dx, dy = component.direction
    if dx != 0:
        return delta[0] / dx
    if dy != 0:
        return delta[1] / dy
    raise AssertionError("zero component direction")


def point_on_closed_component(point: Point, component: Component) -> bool:
    parameter = line_parameter(point, component)
    if parameter is None:
        return False
    if component.bounded:
        assert component.upper is not None
        return 0 <= parameter <= component.upper
    return parameter >= 0


def proper_intersection(first: Component, second: Component) -> tuple[Point | None, str]:
    denominator = det(first.direction, second.direction)
    if denominator == 0:
        return None, "parallel"
    delta = sub(second.origin, first.origin)
    first_parameter = det(delta, second.direction) / denominator
    second_parameter = det(delta, first.direction) / denominator
    valid = first_parameter > 0 and second_parameter > 0
    if first.bounded:
        assert first.upper is not None
        valid = valid and first_parameter < first.upper
    if second.bounded:
        assert second.upper is not None
        valid = valid and second_parameter < second.upper
    if not valid:
        return None, "outside"
    return add(first.origin, scale(first_parameter, first.direction)), "proper"


def expected_partition(document: dict[str, Any], n: int) -> tuple[set[int], set[int]]:
    if "partition" in document:
        left = {index - 1 for index in document["partition"][0]}
        right = {index - 1 for index in document["partition"][1]}
    else:
        left_size = n // 2
        left = set(range(left_size))
        right = set(range(left_size, n))
    if left | right != set(range(n)) or left & right:
        raise AssertionError((n, "invalid partition", sorted(left), sorted(right)))
    return left, right


def verify_one(n: int, path: Path) -> dict[str, Any]:
    document, shapes = parse_shapes(path, n)
    if len(shapes) != n:
        raise AssertionError((path, len(shapes), n))

    shape_checks = []
    for index, shape in enumerate(shapes):
        u_norm = sum(value * value for value in shape["u"])
        v_norm = sum(value * value for value in shape["v"])
        orientation = det(shape["u"], shape["v"])
        if u_norm != v_norm or u_norm <= 0 or orientation <= 0 or shape["radius"] <= 0:
            raise AssertionError(
                (n, index + 1, "shape", u_norm, v_norm, orientation, shape["radius"])
            )
        shape_checks.append(
            {
                "shape": index + 1,
                "equal_positive_direction_norms": True,
                "positive_orientation": True,
                "positive_radius": True,
            }
        )

    # Every vertex must be disjoint from every component of every other A.
    named_vertices: list[tuple[int, str, Point]] = []
    for index, shape in enumerate(shapes):
        for name, point in zip(("apex", "base_u", "base_v"), vertices(shape)):
            named_vertices.append((index, name, point))
    for (i, name_i, point_i), (j, name_j, point_j) in combinations(named_vertices, 2):
        if i != j and point_i == point_j:
            raise AssertionError((n, "coincident foreign vertices", i + 1, name_i, j + 1, name_j))
    foreign_vertex_hits = []
    for i, name, point in named_vertices:
        for j, shape in enumerate(shapes):
            if i == j:
                continue
            for component_index, component in enumerate(components(shape)):
                if point_on_closed_component(point, component):
                    foreign_vertex_hits.append(
                        {
                            "vertex_shape": i + 1,
                            "vertex": name,
                            "component_shape": j + 1,
                            "component": component_index,
                        }
                    )
    if foreign_vertex_hits:
        raise AssertionError((n, "foreign vertex-component incidences", foreign_vertex_hits[:8]))

    matrix = [[0] * n for _ in range(n)]
    points: list[Point] = []
    parallel_pairs = 0
    for first, second in combinations(range(n), 2):
        for left_component in components(shapes[first]):
            for right_component in components(shapes[second]):
                point, status = proper_intersection(left_component, right_component)
                if status == "parallel":
                    parallel_pairs += 1
                if point is not None:
                    matrix[first][second] += 1
                    matrix[second][first] += 1
                    points.append(point)

    left, right = expected_partition(document, n)
    target = [
        [
            0
            if first == second
            else (8 if ((first in left) != (second in left)) else 7)
            for second in range(n)
        ]
        for first in range(n)
    ]
    expected_crossings = 7 * n * (n - 1) // 2 + n * n // 4
    expected_regions = expected_crossings + 2 * n + 1

    if matrix != target:
        raise AssertionError((n, "pair crossing matrix", matrix, target))
    if parallel_pairs:
        raise AssertionError((n, "parallel cross-shape supporting components", parallel_pairs))
    if len(points) != expected_crossings:
        raise AssertionError((n, "crossing count", len(points), expected_crossings))
    if len(set(points)) != expected_crossings:
        raise AssertionError((n, "global crossing distinctness", len(points), len(set(points))))

    return {
        "n": n,
        "certificate": str(path.relative_to(ROOT)),
        "valid": True,
        "partition": [
            [index + 1 for index in sorted(left)],
            [index + 1 for index in sorted(right)],
        ],
        "shape_checks": shape_checks,
        "foreign_vertex_component_incidences": 0,
        "parallel_cross_shape_component_pairs": 0,
        "pair_crossing_matrix": matrix,
        "proper_crossings": expected_crossings,
        "globally_distinct_crossings": expected_crossings,
        "regions": expected_regions,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "verification" / "exact_certificates_n4_n16.json",
    )
    args = parser.parse_args()

    results = [verify_one(n, CERTIFICATES[n]) for n in sorted(CERTIFICATES)]
    output = {
        "valid": True,
        "arithmetic": "Python fractions.Fraction only",
        "scope": "Exact generic rational certificates for 4 <= n <= 16",
        "values": {str(row["n"]): row["regions"] for row in results},
        "results": results,
        "conclusion": (
            "Every certificate has the balanced 7/8 crossing matrix, no cross-shape "
            "supporting-line parallelism, no foreign vertex incidence, and globally "
            "distinct proper rational crossings."
        ),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps({"valid": True, "values": output["values"], "output": str(args.output)}, indent=2))


if __name__ == "__main__":
    main()
