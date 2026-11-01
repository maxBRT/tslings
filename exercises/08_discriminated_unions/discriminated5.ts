// In the reducer pattern (React's `useReducer`, Redux, most state machines),
// every change is described by an action object, and one function computes
// the next state from the current state and an action. `Action` is a
// discriminated union on `type`, so each `case` can read that action's own
// fields, and the `satisfies never` at the bottom lists the actions that no
// `case` handles yet.
//
// Finish the music player's reducer. The state is readonly, so return a new
// object (`{ ...state, playing: false }`) instead of changing it.

import { test } from "node:test";
import assert from "node:assert/strict";

type Track = { readonly title: string; readonly seconds: number };

type PlayerState = {
  readonly queue: readonly Track[];
  readonly index: number; // position of the current track in `queue`
  readonly playing: boolean;
  readonly position: number; // seconds into the current track
};

type Action =
  | { type: "play" }
  | { type: "pause" }
  | { type: "next" }
  | { type: "seek"; seconds: number }
  | { type: "enqueue"; track: Track };

function reducer(state: PlayerState, action: Action): PlayerState {
  switch (action.type) {
    case "play":
      return { ...state, playing: state.queue.length > 0 };
    case "pause":
      return { ...state, playing: false };
    // TODO: Handle the remaining actions:
    //   "next":    move to the next track, at position 0. On the last track,
    //              stay on it but stop: position 0, not playing.
    //   "seek":    jump to `seconds`, kept between 0 and the current track's
    //              length. With an empty queue, change nothing.
    //   "enqueue": add the track at the end of the queue.
    default:
      // Errors until every action has a `case`. At runtime, an unknown action
      // (sent by a newer client, say) leaves the state as it is.
      action satisfies never;
      return state;
  }
}

// Don't change the tests below.

const intro: Track = { title: "Intro", seconds: 90 };
const anthem: Track = { title: "Anthem", seconds: 240 };

const empty: PlayerState = { queue: [], index: 0, playing: false, position: 0 };

function run(state: PlayerState, actions: Action[]): PlayerState {
  return actions.reduce(reducer, state);
}

test("play and pause", () => {
  const playing = run(empty, [{ type: "enqueue", track: intro }, { type: "play" }]);
  assert.equal(playing.playing, true);
  assert.equal(run(playing, [{ type: "pause" }]).playing, false);
});

test("enqueue adds at the end, without touching the old state", () => {
  const one = run(empty, [{ type: "enqueue", track: intro }]);
  const two = run(one, [{ type: "enqueue", track: anthem }]);
  assert.deepEqual(two.queue, [intro, anthem]);
  assert.deepEqual(one.queue, [intro]);
});

test("seek stays within the track", () => {
  const state = run(empty, [{ type: "enqueue", track: intro }]);
  assert.equal(run(state, [{ type: "seek", seconds: 30 }]).position, 30);
  assert.equal(run(state, [{ type: "seek", seconds: 500 }]).position, 90);
  assert.equal(run(state, [{ type: "seek", seconds: -5 }]).position, 0);
  assert.deepEqual(run(empty, [{ type: "seek", seconds: 30 }]), empty);
});

test("next moves to the next track", () => {
  const state = run(empty, [
    { type: "enqueue", track: intro },
    { type: "enqueue", track: anthem },
    { type: "play" },
    { type: "seek", seconds: 42 },
    { type: "next" },
  ]);
  assert.deepEqual(state, { queue: [intro, anthem], index: 1, playing: true, position: 0 });
});

test("next on the last track stops", () => {
  const state = run(empty, [
    { type: "enqueue", track: intro },
    { type: "play" },
    { type: "seek", seconds: 42 },
    { type: "next" },
  ]);
  assert.deepEqual(state, { queue: [intro], index: 0, playing: false, position: 0 });
});
