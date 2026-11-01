// TypeScript has four built-in types that transform string literal types:
// `Uppercase`, `Lowercase`, `Capitalize` and `Uncapitalize`.
//
//   type Handler = `on${Capitalize<"click">}`;   // "onClick"
//
// Combined with key remapping (`as` in a mapped type, from chapter 17), they rename
// every key of a type. One catch: `keyof T` may contain number and symbol keys, which
// `Capitalize` doesn't accept. `K & string` keeps only the string keys.
//
// This media player exposes a getter for each piece of its state (`getVolume`...)
// and takes one optional callback prop per event (`onPlay`, `onSeek`...).
// Write `Getters<T>` and `EventProps<E>` so the names follow `PlayerState` and
// `PlayerEvents`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

type PlayerState = { volume: number; currentTime: number; playbackRate: number };

type PlayerEvents = {
  play: undefined;
  pause: undefined;
  seek: { from: number; to: number };
  volumeChange: number;
};

// TODO: One `getXxx` function per key of `T`, returning that key's type.
type Getters<T> = { [K in keyof T]: () => T[K] };

// TODO: One optional `onXxx` callback per event, receiving that event's payload.
type EventProps<E> = { [K in keyof E]?: (payload: E[K]) => void };

type Player = Getters<PlayerState> & {
  play(): void;
  seek(to: number): void;
  setVolume(volume: number): void;
};

function createPlayer(props: EventProps<PlayerEvents>): Player {
  const state: PlayerState = { volume: 1, currentTime: 0, playbackRate: 1 };
  return {
    getVolume: () => state.volume,
    getCurrentTime: () => state.currentTime,
    getPlaybackRate: () => state.playbackRate,
    play: () => props.onPlay?.(undefined),
    seek: (to) => {
      const from = state.currentTime;
      state.currentTime = to;
      props.onSeek?.({ from, to });
    },
    setVolume: (volume) => {
      state.volume = volume;
      props.onVolumeChange?.(volume);
    },
  };
}

// Don't change the tests below.

test("getters read the current state", () => {
  const player = createPlayer({});
  player.seek(42);
  player.setVolume(0.5);
  assert.equal(player.getCurrentTime(), 42);
  assert.equal(player.getVolume(), 0.5);
  assert.equal(player.getPlaybackRate(), 1);
});

test("event props are called with the event payload", () => {
  const events: string[] = [];
  const player = createPlayer({
    onPlay: () => events.push("play"),
    onSeek: ({ from, to }) => events.push(`seek ${from} -> ${to}`),
  });
  player.play();
  player.seek(30);
  player.setVolume(0.2);
  assert.deepEqual(events, ["play", "seek 0 -> 30"]);
});

type _tests = [
  Expect<
    Equal<
      Getters<PlayerState>,
      { getVolume: () => number; getCurrentTime: () => number; getPlaybackRate: () => number }
    >
  >,
  Expect<
    Equal<
      EventProps<PlayerEvents>,
      {
        onPlay?: (payload: undefined) => void;
        onPause?: (payload: undefined) => void;
        onSeek?: (payload: { from: number; to: number }) => void;
        onVolumeChange?: (payload: number) => void;
      }
    >
  >,
  Expect<Equal<Getters<{ id: string; 0: boolean }>, { getId: () => string }>>,
];
