// A type can refer to itself, so a conditional type can walk a nested structure.
// Like a recursive function, a recursive type needs base cases where it stops.
//
// `Readonly<T>` is shallow: nested objects and arrays inside stay mutable. App config
// is a good place for a deep read-only type. It's loaded once at startup, and nothing
// should change it afterwards, not even `config.server.port = 0` deep in some module.
//
// Write `DeepReadonly<T>`:
// - a function stays as it is (a mapped type would turn it into an empty object),
// - any other object (arrays and tuples included) gets `readonly` properties whose
//   types are made deeply read-only in turn,
// - anything else (string, number, ...) stays as it is.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type AppConfig = {
  server: { host: string; port: number; tls?: { certPath: string } };
  allowedOrigins: string[];
  rateLimit: [requests: number, perSeconds: number];
  onError: (error: Error) => void;
};

// The function check must come first: functions are objects too. A mapped type over an
// array or tuple type gives back a readonly array or tuple, so arrays need no special
// case. (`Map`, `Set` or `Date` would need their own branches; config rarely has them.)
type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

const reported: string[] = [];

function loadConfig(): DeepReadonly<AppConfig> {
  return {
    server: { host: "0.0.0.0", port: 8080, tls: { certPath: "/etc/ssl/app.pem" } },
    allowedOrigins: ["https://app.example.com", "https://admin.example.com"],
    rateLimit: [100, 60],
    onError: (error) => {
      reported.push(error.message);
    },
  };
}

function describeConfig(config: DeepReadonly<AppConfig>): string {
  const [requests, perSeconds] = config.rateLimit;
  const scheme = config.server.tls === undefined ? "http" : "https";
  return `${scheme}://${config.server.host}:${config.server.port}, ${requests} req/${perSeconds}s`;
}

// Don't change the tests below.

test("the config can be read at every level", () => {
  const config = loadConfig();
  assert.equal(describeConfig(config), "https://0.0.0.0:8080, 100 req/60s");
  assert.equal(config.allowedOrigins.at(-1), "https://admin.example.com");
});

test("functions in the config can still be called", () => {
  loadConfig().onError(new Error("disk full"));
  assert.deepEqual(reported, ["disk full"]);
});

type _tests = [
  Expect<
    Equal<
      DeepReadonly<AppConfig>,
      {
        readonly server: {
          readonly host: string;
          readonly port: number;
          readonly tls?: { readonly certPath: string };
        };
        readonly allowedOrigins: readonly string[];
        readonly rateLimit: readonly [requests: number, perSeconds: number];
        readonly onError: (error: Error) => void;
      }
    >
  >,
  Expect<
    Equal<
      DeepReadonly<{ a: { b: { c: number[] } } }>,
      { readonly a: { readonly b: { readonly c: readonly number[] } } }
    >
  >,
  Expect<Equal<DeepReadonly<string>, string>>,
  Expect<Equal<DeepReadonly<() => number[]>, () => number[]>>,
];
