// Usually the code that creates a promise also settles it. Sometimes the answer arrives later,
// somewhere else: `call` below sends a request to a worker, and the reply comes back through
// `handleReply`, which must resolve the right promise.
//
// The old trick, `let resolve; new Promise((res) => { resolve = res; })`, leaves TypeScript
// unsure that `resolve` is ever assigned: it can't know that the callback has already run.
// `Promise.withResolvers<T>()` (ES2024) returns `{ promise, resolve, reject }`, all typed.
//
// Callers can also stop waiting, with an `AbortSignal`. `AbortSignal.timeout(ms)` aborts after
// a delay; an `AbortController` aborts when you call `controller.abort(reason)`. Either way,
// `signal.reason` says why, and the signal fires an "abort" event.
//
// Finish `call`: create its promise with `Promise.withResolvers`, and make it listen to `signal`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";

interface RpcRequest {
  readonly id: number;
  readonly method: string;
}

interface RpcReply {
  readonly id: number;
  readonly result: string;
}

class RpcClient {
  readonly #send: (request: RpcRequest) => void;
  /** Calls waiting for a reply, by request id. */
  readonly #pending = new Map<number, (result: string) => void>();
  #nextId = 1;

  constructor(send: (request: RpcRequest) => void) {
    this.#send = send;
  }

  get pendingCount(): number {
    return this.#pending.size;
  }

  call(method: string, signal: AbortSignal): Promise<string> {
    // TODO: If the signal has already aborted, reject right away with `signal.reason`, without
    // sending anything.
    const id = this.#nextId++;
    // TODO: Create the promise with `Promise.withResolvers`.
    let resolve: (result: string) => void;
    const promise = new Promise<string>((res) => {
      resolve = res;
    });
    // TODO: When `signal` aborts, forget the call and reject with `signal.reason`.
    this.#pending.set(id, resolve);
    this.#send({ id, method });
    return promise;
  }

  handleReply(reply: RpcReply): void {
    const resolve = this.#pending.get(reply.id);
    if (resolve === undefined) return; // a late reply to a call that was aborted
    this.#pending.delete(reply.id);
    resolve(reply.result);
  }
}

// Don't change the tests below.

function connect(): { client: RpcClient; sent: RpcRequest[] } {
  const sent: RpcRequest[] = [];
  const client = new RpcClient((request) => sent.push(request));
  return { client, sent };
}

/** Rejects if `promise` is still pending after `ms`, instead of waiting forever. */
function within<T>(promise: Promise<T>, ms = 200): Promise<T> {
  const tooSlow = sleep(ms).then(() => {
    throw new Error(`still pending after ${ms} ms: did the call listen to its signal?`);
  });
  return Promise.race([promise, tooSlow]);
}

test("resolves each call with its own reply", async (t) => {
  // Counts the calls to `Promise.withResolvers`, without changing what it does.
  const withResolvers = t.mock.method(Promise, "withResolvers");
  const { client, sent } = connect();
  const thumbnail = client.call("thumbnail", AbortSignal.timeout(1_000));
  const transcode = client.call("transcode", AbortSignal.timeout(1_000));
  assert.deepEqual(sent, [
    { id: 1, method: "thumbnail" },
    { id: 2, method: "transcode" },
  ]);
  client.handleReply({ id: 2, result: "video.webm" });
  client.handleReply({ id: 1, result: "thumb.png" });
  assert.equal(await thumbnail, "thumb.png");
  assert.equal(await transcode, "video.webm");
  assert.equal(client.pendingCount, 0);
  assert.equal(
    withResolvers.mock.callCount(),
    2,
    "each call should create its promise with Promise.withResolvers",
  );
});

test("rejects when the call times out", async () => {
  const { client } = connect();
  await assert.rejects(within(client.call("thumbnail", AbortSignal.timeout(20))), {
    name: "TimeoutError",
  });
  assert.equal(client.pendingCount, 0, "a call that timed out should be forgotten");
});

test("rejects with the reason given to abort()", async () => {
  const { client } = connect();
  const controller = new AbortController();
  const call = client.call("transcode", controller.signal);
  controller.abort(new Error("the user closed the tab"));
  await assert.rejects(within(call), { message: "the user closed the tab" });
  assert.equal(client.pendingCount, 0, "an aborted call should be forgotten");
  client.handleReply({ id: 1, result: "too late" }); // ignored
});

test("doesn't even send a call whose signal has already aborted", async () => {
  const { client, sent } = connect();
  let call: Promise<string>;
  try {
    call = client.call("thumbnail", AbortSignal.abort());
  } catch {
    // Code that gets a promise handles failures with `await` or `.catch()`, so a function that
    // returns a promise must report every failure through it, even one known before it starts.
    assert.fail("`call` threw instead of returning a rejected promise");
  }
  assert.deepEqual(sent, [], "the call was sent although its signal had already aborted");
  await assert.rejects(within(call), { name: "AbortError" });
  assert.equal(client.pendingCount, 0);
});
