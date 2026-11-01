// When you catch a low-level error and throw a clearer one, don't throw the original away:
// attach it as the `cause` (ES2022). `new Error("Could not load config", { cause: error })`
// keeps the whole story, and Node prints every cause in the stack trace.
//
// The second argument of `Error`'s constructor has the type `ErrorOptions`. A subclass that
// declares its own constructor only accepts it if that constructor takes it too and passes it
// on to `super`. And `error.cause` is `unknown`: anything can be a cause, so narrow it again.
//
// Make `ConfigError` accept a cause, then write `explain`, which turns an error and its chain
// of causes into one line for the logs.

import { test } from "node:test";
import assert from "node:assert/strict";

class ConfigError extends Error {
  override readonly name = "ConfigError";

  // TODO: Accept a second `options` parameter, and forward it to `super`.
  constructor(message: string) {
    super(message);
  }
}

function parseConfig(path: string, text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ConfigError(`Invalid JSON in ${path}`, { cause: error });
  }
}

function startServer(configText: string): string {
  try {
    const config = parseConfig("app.json", configText);
    return `started with ${JSON.stringify(config)}`;
  } catch (error) {
    throw new Error("Could not start the server", { cause: error });
  }
}

// TODO: Return the messages of `error` and of each of its causes, joined with ": ".
// A cause that isn't an `Error` (a string, a number...) is turned into a string and ends the
// chain. Example: "Could not start the server: Invalid JSON in app.json: Unexpected token..."
function explain(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Don't change the tests below.

test("ConfigError keeps the original error as its cause", () => {
  assert.throws(
    () => parseConfig("app.json", "{ port: 8080 }"),
    (error) => {
      assert.ok(error instanceof ConfigError);
      assert.equal(error.message, "Invalid JSON in app.json");
      assert.ok(error.cause instanceof SyntaxError);
      return true;
    },
  );
});

test("explain follows the chain of causes", () => {
  const error = new Error("Could not save invoice", {
    cause: new Error("Database unavailable", { cause: new Error("connection refused") }),
  });
  assert.equal(explain(error), "Could not save invoice: Database unavailable: connection refused");
});

test("explain handles causes that are not errors", () => {
  const upload = new Error("Upload failed", { cause: "quota exceeded" });
  assert.equal(explain(upload), "Upload failed: quota exceeded");
  assert.equal(explain(new Error("Payment failed", { cause: 402 })), "Payment failed: 402");
  assert.equal(explain(new Error("No cause")), "No cause");
  assert.equal(explain("just a string"), "just a string");
});

test("explain on a real chain", () => {
  assert.throws(
    () => startServer("{ port: 8080 }"),
    (error) => {
      assert.match(explain(error), /^Could not start the server: Invalid JSON in app\.json: \w+/);
      return true;
    },
  );
});
