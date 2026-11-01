// When a conditional type checks a bare type parameter and receives a union, it runs
// once per member and joins the results back into a union. This is called distribution.
// `never` disappears from unions, so answering `never` for a member removes it:
//
//   type Exclude<T, U> = T extends U ? never : T;    // that's the real definition
//   Exclude<"draft" | "sent" | "failed", "draft">    // "sent" | "failed"
//
// Distribution also fixes a classic trap: `Omit` doesn't distribute. Given a union,
// it only keeps the keys that every member shares, and the discriminated union is lost.
//
// Write `OnChannel<T, C>` (keep the members whose `channel` is `C`) and
// `DistributiveOmit<T, K>` (an `Omit` applied to each member separately).

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type EmailNotification = {
  channel: "email";
  id: string;
  sentAt: Date;
  to: string;
  subject: string;
};
type SmsNotification = { channel: "sms"; id: string; sentAt: Date; phone: string; text: string };
type PushNotification = { channel: "push"; id: string; sentAt: Date; deviceId: string };
type AppNotification = EmailNotification | SmsNotification | PushNotification;

// TODO: Keep only the members of `T` whose `channel` is `C`.
type OnChannel<T, C extends string> = T;

// TODO: Apply `Omit<..., K>` to each member of `T` separately.
type DistributiveOmit<T, K extends PropertyKey> = Omit<T, K>;

// The SMS provider bills per 160-character segment.
function smsSegments(sent: readonly OnChannel<AppNotification, "sms">[]): number {
  return sent.reduce((total, sms) => total + Math.ceil(sms.text.length / 160), 0);
}

// What callers give to the notification service: it fills in `id` and `sentAt` itself.
type NewNotification = DistributiveOmit<AppNotification, "id" | "sentAt">;

function preview(notification: NewNotification): string {
  switch (notification.channel) {
    case "email":
      return `Email to ${notification.to}: ${notification.subject}`;
    case "sms":
      return `SMS to ${notification.phone}: ${notification.text}`;
    case "push":
      return `Push to device ${notification.deviceId}`;
  }
}

// Don't change the tests below.

test("sms segments are counted per message", () => {
  const sentAt = new Date("2026-11-01T09:00:00Z");
  const sms = (text: string) => ({ channel: "sms", id: "n1", sentAt, phone: "+33", text }) as const;
  assert.equal(smsSegments([sms("Your code is 4821"), sms("x".repeat(161))]), 3);
});

test("previews show the channel-specific fields", () => {
  assert.equal(
    preview({ channel: "email", to: "ada@example.com", subject: "Welcome" }),
    "Email to ada@example.com: Welcome",
  );
  assert.equal(
    preview({ channel: "sms", phone: "+33612345678", text: "Your parcel is here" }),
    "SMS to +33612345678: Your parcel is here",
  );
  assert.equal(preview({ channel: "push", deviceId: "ios-7" }), "Push to device ios-7");
});

type _tests = [
  Expect<Equal<OnChannel<AppNotification, "sms">, SmsNotification>>,
  Expect<Equal<OnChannel<AppNotification, "email" | "push">, EmailNotification | PushNotification>>,
  Expect<
    Equal<
      NewNotification,
      | { channel: "email"; to: string; subject: string }
      | { channel: "sms"; phone: string; text: string }
      | { channel: "push"; deviceId: string }
    >
  >,
  Expect<Equal<DistributiveOmit<{ a: 1; x: 0 } | { b: 2; x: 0 }, "x">, { a: 1 } | { b: 2 }>>,
];
