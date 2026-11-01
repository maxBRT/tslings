// An indexed access type reads one type out of another, with the same
// brackets as JavaScript: `Upload["format"]` is the type of that property.
// Two forms come up all the time:
//   T[number]    the element type of an array or tuple type
//   T[keyof T]   the union of the types of all of T's properties
//
// With `as const`, an array or object keeps its literal values, so you can
// keep ONE list that exists at runtime and derive the union type from it.

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

// `typeof IMAGE_FORMATS` is `readonly ["png", "jpeg", "webp", "avif"]`, and
// indexing a tuple type with `number` gives the union of its elements.
// `typeof IMAGE_FORMATS[number]` means the same; the parentheses only help the reader.
type ImageFormat = (typeof IMAGE_FORMATS)[number];

interface Upload {
  format: ImageFormat;
  status: keyof typeof STATUS_LABELS;
  // `cover` fills the frame and crops what sticks out, `contain` shows the whole image.
  resize: { fit: "cover" | "contain"; widthPx: number };
}

// The union of all the values of the object. Without `as const` on
// STATUS_LABELS, this would only be `string`.
type StatusLabel = (typeof STATUS_LABELS)[keyof typeof STATUS_LABELS];

// Indexed access types chain like property accesses.
type Fit = Upload["resize"]["fit"];

function statusLabel(upload: Upload): StatusLabel {
  return STATUS_LABELS[upload.status];
}

// With `fit: string`, the typo "covers" compiled and no image was ever
// cropped. With the precise union, TypeScript reported that the comparison
// could never be true.
function cropsImage(fit: Fit): boolean {
  return fit === "cover";
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
