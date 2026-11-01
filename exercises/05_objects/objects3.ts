// `readonly` on a property means it can't be reassigned once the object
// exists. To "change" readonly data, build an updated copy with spread syntax:
// `{ ...prefs, fontSize: 16 }` copies every property, then overrides one.
//
// That's how state works in React, Redux and most UI code: an update is a new
// object, so anything holding the old one keeps seeing the old values, and a
// cheap `===` check tells whether something changed.
//
// Both functions below mutate the preferences they receive. TypeScript rejects
// that. Return updated copies instead.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type Theme = "light" | "dark" | "system";

interface Preferences {
  readonly theme: Theme;
  readonly fontSize: number;
  readonly mutedChannels: readonly string[];
}

function withTheme(prefs: Preferences, theme: Theme): Preferences {
  // TODO: Return a copy of `prefs` with the new theme.
  prefs.theme = theme;
  return prefs;
}

function withMutedChannel(prefs: Preferences, channel: string): Preferences {
  // TODO: Return a copy of `prefs` with `channel` added at the end of `mutedChannels`.
  prefs.mutedChannels.push(channel);
  return prefs;
}

// Don't change the tests below.

const saved: Preferences = { theme: "light", fontSize: 14, mutedChannels: ["#random"] };

test("change the theme", () => {
  const updated = withTheme(saved, "dark");
  assert.deepEqual(updated, { theme: "dark", fontSize: 14, mutedChannels: ["#random"] });
  assert.equal(withTheme(updated, "system").theme, "system");
});

test("mute a channel", () => {
  const updated = withMutedChannel(saved, "#memes");
  assert.deepEqual(updated.mutedChannels, ["#random", "#memes"]);
  assert.equal(updated.fontSize, 14);
  const again = withMutedChannel(updated, "#standup");
  assert.deepEqual(again.mutedChannels, ["#random", "#memes", "#standup"]);
});

test("the saved preferences never change", () => {
  withTheme(saved, "system");
  withMutedChannel(saved, "#off-topic");
  assert.deepEqual(saved, { theme: "light", fontSize: 14, mutedChannels: ["#random"] });
  assert.notEqual(withTheme(saved, "dark"), saved);
});

// Type tests: each line only compiles when the two types are exactly the same.
type _tests = [
  Expect<
    Equal<
      Preferences,
      {
        readonly theme: Theme;
        readonly fontSize: number;
        readonly mutedChannels: readonly string[];
      }
    >
  >,
];
