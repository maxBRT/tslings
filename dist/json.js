// Small helpers to read JSON files without trusting their shape.
//
// `JSON.parse` returns `any`. Assigning it to `unknown` and narrowing it with
// type guards is the honest way to use data that comes from outside the program.
import { readFileSync } from "node:fs";
/** `true` for plain objects (not `null`, not arrays). */
export function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
/** Read a JSON file that must contain an object. */
export function readJsonObject(path) {
    const value = JSON.parse(readFileSync(path, "utf8"));
    if (!isRecord(value)) {
        throw new Error(`The file ${path} doesn't contain a JSON object`);
    }
    return value;
}
/** The string at `object[key]`, or `undefined` when it's missing or not a string. */
export function stringField(object, key) {
    const value = object[key];
    return typeof value === "string" ? value : undefined;
}
