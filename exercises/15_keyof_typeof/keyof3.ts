// An indexed access type reads one type out of another, with the same
// brackets as JavaScript: `Upload["format"]` is the type of that property.
// Two forms come up all the time:
//   T[number]    the element type of an array or tuple type
//   T[keyof T]   the union of the types of all of T's properties
//
// With `as const`, an array or object keeps its literal values, so you can
// keep ONE list that exists at runtime and derive the union type from it.
//
// Derive the three types below. The last one will reveal a bug.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

// The formats an image service accepts.
const IMAGE_FORMATS = ["png", "jpeg", "webp", "avif"] as const;

const STATUS_LABELS = {
  queued: "Waiting",
  resizing: "Resizing",
  done: "Ready",
} as const;

// TODO: Someone added "avif" to IMAGE_FORMATS and forgot to update this union.
// Derive it from IMAGE_FORMATS, so it can't fall behind again.
type ImageFormat = "png" | "jpeg" | "webp";

interface Upload {
  format: ImageFormat;
  status: keyof typeof STATUS_LABELS;
  // `cover` fills the frame and crops what sticks out, `contain` shows the whole image.
  resize: { fit: "cover" | "contain"; widthPx: number };
}

// TODO: Every label STATUS_LABELS can produce: "Waiting" | "Resizing" | "Ready".
type StatusLabel = string;

// TODO: The type of `resize.fit` in Upload.
type Fit = string;

function statusLabel(upload: Upload): StatusLabel {
  return STATUS_LABELS[upload.status];
}

function cropsImage(fit: Fit): boolean {
  return fit === "covers";
}

// Don't change the tests below.

test("labels the status", () => {
  const upload: Upload = {
    format: "avif",
    status: "resizing",
    resize: { fit: "contain", widthPx: 1200 },
  };
  assert.equal(statusLabel(upload), "Resizing");
});

test("knows which fit crops the image", () => {
  assert.equal(cropsImage("cover"), true);
  assert.equal(cropsImage("contain"), false);
});

test("IMAGE_FORMATS is still a real array at runtime", () => {
  assert.deepEqual(IMAGE_FORMATS.toSorted(), ["avif", "jpeg", "png", "webp"]);
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<Equal<ImageFormat, "png" | "jpeg" | "webp" | "avif">>,
  Expect<Equal<StatusLabel, "Waiting" | "Resizing" | "Ready">>,
  Expect<Equal<Fit, "cover" | "contain">>,
];
