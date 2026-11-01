// A discriminated union is a union of object types that all have one property,
// the discriminant, with a different literal type in each member (here `kind`).
// Checking the discriminant narrows the whole object, so each branch can use
// the fields of its own member. It's how TypeScript models "one of these
// shapes" (other languages call these sum types or tagged enums).
//
// Write the one-line preview that a chat app shows under each conversation.

import { test } from "node:test";
import assert from "node:assert/strict";

type Message =
  | { kind: "text"; author: string; body: string }
  | { kind: "image"; author: string; caption?: string }
  | { kind: "poll"; author: string; question: string; options: string[] }
  | { kind: "member_joined"; member: string };

function preview(message: Message): string {
  // TODO: Switch on `message.kind` and build each preview (see the tests).
  return `${message.author}: ${message.body}`;
}

// Don't change the tests below.

test("text", () => {
  assert.equal(
    preview({ kind: "text", author: "Ada", body: "See you at 10" }),
    "Ada: See you at 10",
  );
});

test("image, with or without a caption", () => {
  assert.equal(preview({ kind: "image", author: "Ada" }), "Ada sent a photo");
  assert.equal(
    preview({ kind: "image", author: "Grace", caption: "Sunset" }),
    "Grace sent a photo: Sunset",
  );
});

test("poll", () => {
  const options = ["Pizza", "Sushi", "Tacos"];
  assert.equal(
    preview({ kind: "poll", author: "Linus", question: "Lunch?", options }),
    "Linus asked: Lunch? (3 options)",
  );
});

test("member joined", () => {
  assert.equal(preview({ kind: "member_joined", member: "Grace" }), "Grace joined the chat");
});
