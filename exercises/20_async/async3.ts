// `Promise.all` rejects as soon as one promise rejects, and the other results are lost. When
// some failures are expected, use `Promise.allSettled`: it waits for every promise, never
// rejects, and gives one result per promise. Each result is a discriminated union on `status`:
//
//   { status: "fulfilled"; value: T } | { status: "rejected"; reason: any }
//
// Check `status` before you read `value` or `reason`. And whatever its type says, treat
// `reason` as `unknown`: JavaScript lets code reject a promise with any value, not only with
// an `Error`.
//
// TODO: Make `announce` use `Promise.allSettled`, then finish `summarize` and `describeError`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";

interface Receipt {
  readonly webhook: string;
  readonly messageId: string;
}

interface Summary {
  readonly sent: readonly string[];
  readonly errors: readonly string[];
}

// Fake chat webhooks. Hooks with "down" in their URL answer 503. Two older client libraries
// don't reject with an `Error`: the legacy server's rejects with a bare string, and the one
// for "busy" hooks with the raw HTTP response.
async function postMessage(webhook: string, text: string): Promise<Receipt> {
  await sleep(5);
  if (webhook.includes("down")) throw new Error(`503 from ${webhook}`);
  if (webhook.startsWith("https://legacy.")) return Promise.reject("socket hang up");
  if (webhook.includes("busy")) return Promise.reject({ status: 429 });
  return { webhook, messageId: `msg-${text.length}-${webhook.split("/").at(-1)}` };
}

/** A readable message for any rejection reason: an Error's message, a string as is. */
function describeError(reason: unknown): string {
  // TODO: Anything that is neither an Error nor a string is described as "unknown error".
  return reason.message;
}

function summarize(results: readonly PromiseSettledResult<Receipt>[]): Summary {
  const sent: string[] = [];
  const errors: string[] = [];
  for (const result of results) {
    // TODO: Put each delivery's message id in `sent`, and describe each failure in `errors`.
    sent.push(result.value.messageId);
  }
  return { sent, errors };
}

async function announce(webhooks: readonly string[], text: string): Promise<Summary> {
  const results = await Promise.all(webhooks.map((webhook) => postMessage(webhook, text)));
  return summarize(results);
}

// Don't change the tests below.

test("reports deliveries and failures, in order", async () => {
  const summary = await announce(
    [
      "https://chat.example.com/hooks/backend",
      "https://chat.example.com/hooks/down-for-maintenance",
      "https://chat.example.com/hooks/design",
      "https://legacy.example.com/hooks/ops",
      "https://chat.example.com/hooks/busy-support",
    ],
    "v2.4 is out",
  );
  assert.deepEqual(summary, {
    sent: ["msg-11-backend", "msg-11-design"],
    errors: [
      "503 from https://chat.example.com/hooks/down-for-maintenance",
      "socket hang up",
      "unknown error",
    ],
  });
});

test("doesn't reject when every webhook fails", async () => {
  const summary = await announce(["https://chat.example.com/hooks/down"], "hi");
  assert.deepEqual(summary, { sent: [], errors: ["503 from https://chat.example.com/hooks/down"] });
});

test("describes any rejection reason", () => {
  assert.equal(describeError(new TypeError("bad payload")), "bad payload");
  assert.equal(describeError("timeout"), "timeout");
  assert.equal(describeError({ status: 429 }), "unknown error");
  assert.equal(describeError(undefined), "unknown error");
});
