// A generator does more than produce values: `yield` goes both ways.
//
//   const answer = yield question;
//
// pauses the generator and hands `question` to the caller. The caller resumes it with
// `wizard.next(answer)`, and `answer` becomes the value of the `yield` expression. When the
// generator `return`s, the caller gets that value with `done: true`.
//
// TypeScript types the three directions with `Generator<Yield, Return, Next>`. It can infer
// what you yield and return, but not `Next`: only you know what callers will send back.
// Libraries like Effect and redux-saga build on this pattern.
//
// TODO: Annotate the return type of `signupWizard`.
// TODO: Finish `runWizard`.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { Equal, Expect } from "#type-assert";

interface Question {
  readonly field: "email" | "team" | "company" | "seats";
  readonly prompt: string;
}

type Signup =
  | { readonly plan: "personal"; readonly email: string }
  | {
      readonly plan: "team";
      readonly email: string;
      readonly company: string;
      readonly seats: number;
    };

function* signupWizard() {
  const email = yield { field: "email", prompt: "Work email?" };
  const team = yield { field: "team", prompt: "Is this for a team? (yes/no)" };
  if (team !== "yes") {
    return { plan: "personal", email };
  }
  const company = yield { field: "company", prompt: "Company name?" };
  let seats = Number(yield { field: "seats", prompt: "How many seats?" });
  while (!Number.isInteger(seats) || seats < 1) {
    seats = Number(yield { field: "seats", prompt: "Please enter a whole number of seats:" });
  }
  return { plan: "team", email, company, seats };
}

/** Feeds the answers to the wizard in order, and returns the signup it produces. */
function runWizard(answers: readonly string[]): Signup {
  const wizard = signupWizard();
  let step = wizard.next(); // runs the wizard up to its first `yield`
  for (const answer of answers) {
    if (step.done) break;
    step = wizard.next(answer);
  }
  // TODO: `step` is either a question that is still waiting for an answer, or the final
  // result. Return the result, or throw an Error whose message includes the pending prompt.
  return step.value;
}

// Don't change the tests below.

test("personal signup", () => {
  assert.deepEqual(runWizard(["ada@example.com", "no"]), {
    plan: "personal",
    email: "ada@example.com",
  });
});

test("team signup", () => {
  assert.deepEqual(runWizard(["grace@example.com", "yes", "Navy", "12"]), {
    plan: "team",
    email: "grace@example.com",
    company: "Navy",
    seats: 12,
  });
});

test("asks again until the number of seats makes sense", () => {
  assert.deepEqual(runWizard(["linus@example.com", "yes", "Kernel", "lots", "0", "3"]), {
    plan: "team",
    email: "linus@example.com",
    company: "Kernel",
    seats: 3,
  });
});

test("throws when it runs out of answers", () => {
  assert.throws(() => runWizard(["ada@example.com", "yes"]), /Company name\?/);
  assert.throws(() => runWizard(["linus@example.com", "yes", "Kernel", "many"]), /whole number/);
});

test("the caller drives the wizard with next()", () => {
  const wizard = signupWizard();
  assert.deepEqual(wizard.next(), {
    done: false,
    value: { field: "email", prompt: "Work email?" },
  });
  assert.deepEqual(wizard.next("ada@example.com"), {
    done: false,
    value: { field: "team", prompt: "Is this for a team? (yes/no)" },
  });
  assert.deepEqual(wizard.next("no"), {
    done: true,
    value: { plan: "personal", email: "ada@example.com" },
  });
});

type _tests = [
  Expect<Equal<ReturnType<typeof signupWizard>, Generator<Question, Signup, string>>>,
];
