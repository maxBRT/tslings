// A tuple is an array with a fixed length and a type for each position:
// `[string, number]`. Labels name the positions, `[name: string, age: number]`,
// so editors can show them; they don't change the type. A `?` after a label
// makes that element optional; optional elements come after the required ones.
//
// Reading a position that the tuple declares is safe: `pair[1]` is a `number`,
// not `number | undefined` as it would be for a plain `number[]`.
//
// GeoJSON, the format map APIs use, stores a position as [longitude, latitude],
// with an optional altitude in meters as a third element. Model it, then finish
// `formatPosition`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// Without labels, nothing would tell a reader that longitude comes first,
// which is the classic bug with coordinates.
type Position = [longitude: number, latitude: number, altitude?: number];

function formatPosition(position: Position): string {
  // `altitude` is `number | undefined`: the third element is optional.
  const [longitude, latitude, altitude] = position;
  const coordinates = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  // Compare with `undefined`, not truthiness: an altitude of 0 is real.
  return altitude === undefined ? coordinates : `${coordinates} (${altitude} m)`;
}

function midpoint(a: Position, b: Position): Position {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

// Don't change the tests below.

test("format a position", () => {
  assert.equal(formatPosition([2.29448, 48.85837]), "48.8584, 2.2945");
});

test("format a position with an altitude", () => {
  assert.equal(formatPosition([2.29448, 48.85837, 330]), "48.8584, 2.2945 (330 m)");
  assert.equal(formatPosition([4.8952, 52.3702, 0]), "52.3702, 4.8952 (0 m)");
});

test("midpoint", () => {
  assert.deepEqual(midpoint([0, 0], [2, 4]), [1, 2]);
  assert.deepEqual(midpoint([2.5, 48], [3.5, 50, 120]), [3, 49]);
});

// Type tests: each line only compiles when the two types are exactly the same.
// (Labels don't count when comparing tuple types.)
type _tests = [Expect<Equal<Position, [number, number, number?]>>];
