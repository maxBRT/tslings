// JavaScript lets you `throw` anything: an `Error`, but also a string, a number, `undefined`...
// So TypeScript types the variable of a `catch` clause as `unknown` (the
// `useUnknownInCatchVariables` option, part of `strict`). Before reading `error.message`, prove
// that `error` is an `Error` with `instanceof`.
//
// `runJob` runs a background job and reports how it went. Some jobs come from old libraries
// that throw plain strings. Make `runJob` report a readable reason, whatever the job throws.

import { test } from "node:test";
import assert from "node:assert/strict";

type JobReport = { ok: true } | { ok: false; reason: string };

function runJob(job: () => void): JobReport {
  try {
    job();
    return { ok: true };
  } catch (error) {
    // TODO: Use the message of an `Error`, and turn anything else into a string.
    return { ok: false, reason: error.message };
  }
}

// Don't change the tests below.

test("a job that succeeds", () => {
  assert.deepEqual(runJob(() => {}), { ok: true });
});

test("a job that throws an Error", () => {
  const report = runJob(() => {
    throw new Error("disk full");
  });
  assert.deepEqual(report, { ok: false, reason: "disk full" });
});

test("a job that throws a subclass of Error", () => {
  const report = runJob(() => {
    throw new RangeError("page 0 does not exist");
  });
  assert.deepEqual(report, { ok: false, reason: "page 0 does not exist" });
});

test("a job that throws something else", () => {
  const report = runJob(() => {
    throw "timeout after 30s";
  });
  assert.deepEqual(report, { ok: false, reason: "timeout after 30s" });

  const numeric = runJob(() => {
    throw 404;
  });
  assert.deepEqual(numeric, { ok: false, reason: "404" });
});
