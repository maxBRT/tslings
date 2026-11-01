// When a union gets a new member, every `switch` over it must learn about it.
// A `default` branch that "handles everything else" hides the missing cases,
// so TypeScript developers end such switches with an exhaustiveness check.
// Once every member has its `case`, the only type left in `default` is `never`
// (the type with no values), and assigning a real member to `never` fails.
//
//   default: {
//     const unhandled: never = notification;   // or: notification satisfies never;
//     throw new Error(`Unhandled: ${JSON.stringify(unhandled)}`);
//   }
//
// The team just added push notifications. Let the compiler show you every
// place that needs updating.

import { test } from "node:test";
import assert from "node:assert/strict";

type Notification =
  | { channel: "email"; address: string; subject: string }
  | { channel: "sms"; phoneNumber: string }
  | { channel: "push"; deviceToken: string }; // new!

function destination(notification: Notification): string {
  switch (notification.channel) {
    case "email":
      return notification.address;
    case "sms":
      return notification.phoneNumber;
    case "push":
      return notification.deviceToken;
    default: {
      // Unreachable for well-typed callers. The `throw` covers data that
      // escaped the type system, like a channel sent by a newer server.
      const unhandled: never = notification;
      throw new Error(`Unhandled channel: ${JSON.stringify(unhandled)}`);
    }
  }
}

function costInCents(notification: Notification): number {
  switch (notification.channel) {
    case "email":
      return 0;
    case "sms":
      return 5;
    case "push":
      return 1;
    default:
      // The shorter form (TypeScript 4.9+): an error here if a channel is missing.
      notification satisfies never;
      throw new Error(`Unhandled channel: ${JSON.stringify(notification)}`);
  }
}

// Don't change the tests below.

const email: Notification = { channel: "email", address: "ada@example.com", subject: "Hi" };
const sms: Notification = { channel: "sms", phoneNumber: "+33 6 12 34 56 78" };
const push: Notification = { channel: "push", deviceToken: "fcm:4f9a2c" };

test("destination", () => {
  assert.equal(destination(email), "ada@example.com");
  assert.equal(destination(sms), "+33 6 12 34 56 78");
  assert.equal(destination(push), "fcm:4f9a2c");
});

test("cost", () => {
  assert.equal(costInCents(email), 0);
  assert.equal(costInCents(sms), 5);
  assert.equal(costInCents(push), 1, "a push notification costs 1 cent");
});

test("a channel this code doesn't know is an error", () => {
  // `JSON.parse` returns `any`, which TypeScript lets into a `Notification`
  // without checking. Here it stands for data from a newer server, with a
  // channel that didn't exist when this code was written.
  const webhook: Notification = JSON.parse('{"channel":"webhook","url":"https://x.example"}');
  assert.throws(() => destination(webhook));
  assert.throws(() => costInCents(webhook), "an unknown channel must throw, not cost 0 cents");
});
