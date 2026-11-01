// Small helpers to read JSON files without trusting their shape.
//
// `JSON.parse` returns `any`. Assigning it to `unknown` and narrowing it with
// type guards is the honest way to use data that comes from outside the program.

import { readFileSync } from "node:fs";

export type JsonObject = Record<string, unknown>;

/** `true` for plain objects (not `null`, not arrays). */
export function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Read a JSON file that must contain an object. */
export function readJsonObject(path: string): JsonObject {
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!isRecord(value)) {
    throw new Error(`The file ${path} doesn't contain a JSON object`);
  }
  return value;
}

/** The string at `object[key]`, or `undefined` when it's missing or not a string. */
export function stringField(object: JsonObject, key: string): string | undefined {
  const value = object[key];
  return typeof value === "string" ? value : undefined;
}
