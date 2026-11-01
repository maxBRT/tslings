// `value!` tells TypeScript "trust me, this isn't null or undefined", and the
// `!` is erased before the code runs. If you were wrong, nothing stops the
// `undefined`. It flows on and crashes somewhere far away, or quietly ends up
// in your data. That's why tslings bans `!`. The honest alternatives:
//   - default:  `env.PORT ?? "3000"` when a fallback makes sense;
//   - throw:    check, and fail early with a message that names the problem;
//   - keep it:  if absence is valid, put `undefined` in the type and let the
//               code that uses the value decide.
//
// Node types `process.env` as a dictionary of `string | undefined`, like `Env`
// below, so any variable may be missing. Load the app's configuration without
// lying to the compiler.

import { test } from "node:test";
import assert from "node:assert/strict";

type Env = Record<string, string | undefined>;

type Config = {
  databaseUrl: string;
  port: number;
  logLevel: string;
  sentryDsn: string | undefined; // error reporting is optional
};

// TODO: Return `env[name]`, or throw an Error that names the variable
// ("Missing environment variable: DATABASE_URL") when it's missing or empty.
function requireEnv(env: Env, name: string): string {
  return env[name]!;
}

function loadConfig(env: Env): Config {
  // TODO: Remove every `!`:
  //   DATABASE_URL is required, PORT defaults to "3000", LOG_LEVEL to "info",
  //   and SENTRY_DSN may be missing.
  return {
    databaseUrl: requireEnv(env, "DATABASE_URL"),
    port: Number(env.PORT!),
    logLevel: env.LOG_LEVEL!,
    sentryDsn: env.SENTRY_DSN!,
  };
}

// Don't change the tests below.

test("a complete environment", () => {
  const env = {
    DATABASE_URL: "postgres://localhost/shop",
    PORT: "8080",
    LOG_LEVEL: "debug",
    SENTRY_DSN: "https://key@sentry.example/1",
  };
  assert.deepEqual(loadConfig(env), {
    databaseUrl: "postgres://localhost/shop",
    port: 8080,
    logLevel: "debug",
    sentryDsn: "https://key@sentry.example/1",
  });
});

test("defaults for optional variables", () => {
  assert.deepEqual(loadConfig({ DATABASE_URL: "postgres://localhost/shop" }), {
    databaseUrl: "postgres://localhost/shop",
    port: 3000,
    logLevel: "info",
    sentryDsn: undefined,
  });
});

test("PORT=0 is a real value", () => {
  // Port 0 asks the operating system for any free port.
  const env = { DATABASE_URL: "postgres://localhost/shop", PORT: "0" };
  assert.equal(loadConfig(env).port, 0);
});

test("a missing or empty required variable fails early, with its name", () => {
  assert.throws(() => loadConfig({ PORT: "8080" }), {
    message: "Missing environment variable: DATABASE_URL",
  });
  assert.throws(() => loadConfig({ DATABASE_URL: "" }), {
    message: "Missing environment variable: DATABASE_URL",
  });
});
