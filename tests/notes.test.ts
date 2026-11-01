import assert from "node:assert/strict";
import { test } from "node:test";
import { checkErrorNotes } from "../src/dev/check.ts";
import { exerciseNoteFor, noteFor, parseNoteKey } from "../src/notes.ts";

test("error_notes keys: a code, optionally followed by a message filter", () => {
  assert.deepEqual(parseNoteKey("TS2339"), { code: "TS2339", filter: undefined });
  assert.deepEqual(parseNoteKey("no-explicit-any"), { code: "no-explicit-any", filter: undefined });
  assert.deepEqual(parseNoteKey("TS2339 all"), { code: "TS2339", filter: "all" });
  assert.deepEqual(parseNoteKey("TS2339 'all'"), { code: "TS2339", filter: "all" });
  assert.deepEqual(parseNoteKey('TS2339 "does not exist"'), { code: "TS2339", filter: "does not exist" });
  assert.deepEqual(parseNoteKey("TS2339 does not exist"), { code: "TS2339", filter: "does not exist" });
  assert.equal(parseNoteKey("TS2339 ''"), undefined);
  // Only matching outer quotes are removed; anything else is literal text of the message.
  assert.deepEqual(parseNoteKey("TS2339 'all"), { code: "TS2339", filter: "'all" });
  assert.deepEqual(parseNoteKey("TS2339 'radius' does not"), { code: "TS2339", filter: "'radius' does not" });
  assert.equal(parseNoteKey("TS2339 "), undefined);
});

test("the most specific note wins", () => {
  const notes = { TS2339: "any", "TS2339 'all'": "all", "TS2339 all' does": "all does", TS2322: "other" };
  const note = (message: string, details: string[] = []): string | undefined =>
    exerciseNoteFor(notes, { code: "TS2339", message, details });
  assert.equal(note("Property 'x' does not exist."), "any");
  assert.equal(note("Property 'all' is missing."), "all");
  assert.equal(note("Property 'all' does not exist."), "all does");
  // The message chain counts as part of the message.
  assert.equal(note("Property 'x' does not exist.", ["  Type 'all' ..."]), "all");
  assert.equal(exerciseNoteFor({ "TS2339 'all'": "all" }, { code: "TS2339", message: "Property 'x'.", details: [] }), undefined);
  assert.equal(exerciseNoteFor(undefined, { code: "TS2339", message: "", details: [] }), undefined);
});

test("dev check validates error_notes keys", () => {
  const check = (errorNotes: Record<string, string>): void => checkErrorNotes({ name: "unions2", errorNotes });
  check({ TS2339: "a", "TS2339 radius": "b", "no-explicit-any 'JSON'": "c" });
  assert.throws(() => check({ TS999x: "a" }), /doesn't start with a TypeScript error code/);
  // An unbalanced quote is literal text of the message, not a syntax error.
  check({ "TS2339 'radius' does not": "a" });
  assert.throws(() => check({ "TS2339 ''": "a" }), /is malformed/);
  assert.throws(() => check({ "TS2339 radius": "a", "TS2339 'radius'": "b" }), /are for the same messages/);
  assert.throws(() => check({ "TS2339 radius": " " }), /is empty/);
});

test("the TS2345 note doesn't ask to change a built-in function", () => {
  assert.doesNotMatch(noteFor("TS2345") ?? "", /change the function's parameter type/);
  assert.match(noteFor("TS2345") ?? "", /if you wrote the function, its parameter type/);
});
