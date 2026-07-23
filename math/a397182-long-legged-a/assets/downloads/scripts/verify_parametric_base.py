#!/usr/bin/env python3
"""Exact regression checks for the rational two-family base construction.

The base construction realizes the three component-incidence masks used in
the all-n proof.  It is deliberately allowed to be nongeneric (several
narrow crossbars concur); the paper obtains a generic rational arrangement
by perturbing inside the open set of strict required incidences.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from itertools import combinations
from pathlib import Path
from typing import NamedTuple

ROOT = Path(__file__).resolve().parents[1]
Point = tuple[Fraction, Fraction]
Vector = tuple[Fraction, Fraction]


class Shape(NamedTuple):
    apex: Point
    radius: Fraction
    lower: Vector
    upper: Vector


class Component(NamedTuple):
    origin: Point
    direction: Vector
    bounded: bool
    upper: Fraction | None


def add(a: Point, b: Vector) -> Point:
    return a[0] + b[0], a[1] + b[1]


def sub(a: Point, b: Point) -> Vector:
    return a[0] - b[0], a[1] - b[1]


def scale(c: Fraction, a: Vector) -> Vector:
    return c * a[0], c * a[1]


def det(a: Vector, b: Vector) -> Fraction:
    return a[0] * b[1] - a[1] * b[0]


def unit(t: Fraction) -> Vector:
    denominator = 1 + t * t
    return (1 - t * t) / denominator, 2 * t / denominator


def rotate(vector: Vector, tangent_half_angle: Fraction) -> Vector:
    c, s = unit(tangent_half_angle)
    return c * vector[0] - s * vector[1], s * vector[0] + c * vector[1]


def components(shape: Shape) -> tuple[Component, Component, Component]:
    p, r, lower, upper = shape
    return (
        Component(p, lower, False, None),
        Component(p, upper, False, None),
        Component(add(p, scale(r, lower)), sub(upper, lower), True, r),
    )


def proper(first: Component, second: Component) -> bool:
    denominator = det(first.direction, second.direction)
    if denominator == 0:
        raise AssertionError("parallel supporting components")
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
    return valid


def mask(first: Shape, second: Shape) -> str:
    return "".join(
        "1" if proper(left, right) else "0"
        for left in components(first)
        for right in components(second)
    )


def construct(p: int, q: int, epsilon: Fraction) -> list[Shape]:
    if p < 1 or q < 1:
        raise ValueError("p and q must both be positive")
    m = max(p, q)
    shapes: list[Shape] = []

    # Rational narrow family.  Here unit(t) has direction angle 2 arctan(t).
    for i in range(1, p + 1):
        axis = unit(Fraction(3 * i) * epsilon)
        lower = rotate(axis, -epsilon)
        upper = rotate(axis, epsilon)
        radius = axis[0]
        apex = sub((Fraction(1), Fraction(0)), scale(radius, axis))
        shapes.append(Shape(apex, radius, lower, upper))

    # Rational wide family.  q_j = tan(theta_j/2) and D_j = 1/q_j.
    for j in range(1, q + 1):
        qj = Fraction(1, 4**j)
        drift = Fraction(4 * m + j) * epsilon
        lower = unit(drift)
        high_at_zero = (-(1 - qj * qj) / (1 + qj * qj), 2 * qj / (1 + qj * qj))
        upper = rotate(high_at_zero, drift)
        d = 1 / qj
        high_endpoint = (1 - 2 * d * epsilon, 3 * epsilon)
        radius = (1 + 3 * epsilon) / upper[1]
        apex = (high_endpoint[0] - radius * upper[0], Fraction(-1))
        shapes.append(Shape(apex, radius, lower, upper))

    return shapes


def verify(p: int, q: int, exponent: int | None = None) -> dict[str, object]:
    m = max(p, q)
    # This explicit dyadic scale is small enough for every archived check
    # through n=64 while keeping exact numerators and denominators moderate.
    # The analytic proof only requires "sufficiently small" epsilon; this
    # verifier records one concrete rational choice.
    exponent = 2 * m + 16 if exponent is None else exponent
    epsilon = Fraction(1, 2**exponent)
    shapes = construct(p, q, epsilon)

    for index, shape in enumerate(shapes):
        lower_norm = shape.lower[0] ** 2 + shape.lower[1] ** 2
        upper_norm = shape.upper[0] ** 2 + shape.upper[1] ** 2
        if lower_norm != upper_norm or lower_norm <= 0 or shape.radius <= 0:
            raise AssertionError((index, lower_norm, upper_norm, shape.radius))
        if det(shape.lower, shape.upper) <= 0:
            raise AssertionError((index, "orientation"))

    expected = {
        "NN": "110110111",
        "NW": "111111011",
        "WW": "111011011",
    }
    counts = {"NN": 0, "NW": 0, "WW": 0}
    observed = {"NN": set(), "NW": set(), "WW": set()}
    crossings = 0
    for first, second in combinations(range(p + q), 2):
        pair_type = "NN" if second < p else ("NW" if first < p else "WW")
        value = mask(shapes[first], shapes[second])
        observed[pair_type].add(value)
        counts[pair_type] += 1
        crossings += value.count("1")
        if value != expected[pair_type]:
            raise AssertionError((p, q, first, second, pair_type, value, expected[pair_type]))

    target_crossings = 7 * (p + q) * (p + q - 1) // 2 + p * q
    if crossings != target_crossings:
        raise AssertionError((p, q, crossings, target_crossings))

    return {
        "p": p,
        "q": q,
        "n": p + q,
        "epsilon": f"1/2^{exponent}",
        "valid": True,
        "pair_type_counts": counts,
        "masks": {key: sorted(value) for key, value in observed.items()},
        "pairwise_crossing_sum": crossings,
        "generic": False,
        "genericity_note": "The strict masks are open; the paper applies a generic rational perturbation.",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--max-n", type=int, default=64, help="check balanced splits for 2 <= n <= MAX_N")
    group.add_argument("--p", type=int, help="left part size; use with --q")
    parser.add_argument("--q", type=int, help="right part size; use with --p")
    parser.add_argument("--output", type=Path, default=ROOT / "verification" / "parametric_base_n2_n64.json")
    args = parser.parse_args()

    if args.p is not None or args.q is not None:
        if args.p is None or args.q is None:
            parser.error("--p and --q must be supplied together")
        results = [verify(args.p, args.q)]
        scope = f"single pair of part sizes p={args.p}, q={args.q}"
    else:
        if args.max_n < 2:
            parser.error("--max-n must be at least 2")
        results = [verify(n // 2, n - n // 2) for n in range(2, args.max_n + 1)]
        scope = f"balanced part sizes for 2 <= n <= {args.max_n}"

    output = {
        "valid": True,
        "arithmetic": "Python fractions.Fraction only",
        "scope": scope,
        "target_masks": {"NN": "110110111", "NW": "111111011", "WW": "111011011"},
        "results": results,
        "logical_status": "regression check; the all-n theorem is proved analytically in the manuscript",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps({"valid": True, "scope": scope, "output": str(args.output)}, indent=2))


if __name__ == "__main__":
    main()
