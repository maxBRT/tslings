# Contributing to tslings

Thanks for helping. Bug reports, fixes to confusing exercises and new exercises
are all welcome.

## Quick reference

- Found a bug? [Open an issue](https://github.com/maxBRT/tslings/issues/new).
- Want to fix a bug or a confusing exercise? Open a pull request.
- Want a new feature or a new chapter? Open an issue first so we can talk about it.
- Want to add an exercise? Read [Adding an exercise](#adding-an-exercise).

When you report a bug, include the output of `node --version`, `tslings --version`,
`ls -la` in your `tslings/` folder, and your OS.

## Development setup

```sh
git clone https://github.com/maxBRT/tslings.git
cd tslings
npm install
node src/main.ts --help     # run the CLI from source, no build needed
npm test                    # unit and integration tests
npm run typecheck
node src/main.ts dev check  # check every official exercise and solution
```

The CLI is written in TypeScript and runs on Node's built-in type stripping, so
the source only uses erasable syntax (no `enum`, no `namespace`, no parameter
properties). `npm run build` compiles it to `dist/` for the published package.

## How an exercise is checked

1. **Type-check** the file with TypeScript 7 and the strict settings in
   [`templates/tsconfig.json`](templates/tsconfig.json).
2. **Lint.** These rules are always errors because they let learners silence the
   checker: `no-explicit-any`, `no-type-assertion` (`as const` is allowed),
   `no-non-null-assertion`, `no-ts-comment`. The style rules `no-var`, `eqeqeq` and
   `prefer-const` are warnings, or errors with `strict_lint = true`. Solutions are
   always checked with style rules as errors.
3. **Run** the file with Node: `node --test` for exercises with tests, plain
   `node` for `test = false`.

The exercise is done when all three pass.

## Adding an exercise

- Put the exercise in `exercises/<topic>/<topic><n>.ts` and add a `// TODO:`
  comment where the learner has to change something.
- Start the file with a short comment that teaches the idea and says why
  TypeScript developers use it. Keep it to a few lines; the chapter README carries
  the longer explanation and the links.
- Put the tests at the bottom, after `// Don't change the tests below.`, using
  `node:test` and `node:assert/strict`.
- When the lesson is about types, test the types too. A runtime test can't tell
  whether the learner kept a precise type or widened it to `unknown`:

  ```ts
  import type { Equal, Expect } from "#type-assert";

  type _tests = [Expect<Equal<ReturnType<typeof parse>, Result<number>>>];
  ```

- Try to cheat your own exercise: return a constant, widen a type, delete the
  code under test. If that passes, the tests need to be stronger.
- Add a solution at `solutions/<topic>/<topic><n>.ts`, written the way you would
  write it at work, with comments where a choice isn't obvious.
- Add the metadata to `info.toml`, then run `node src/main.ts dev check`.

### Exercise metadata

```toml
[[exercises]]
name = "unions2"
dir = "07_unions_narrowing"
hint = """
A few lines that point at the concept without giving the answer away.
Link the handbook page: https://www.typescriptlang.org/docs/handbook/2/narrowing.html"""

# Optional fields:
test = false                     # no tests: run the file and show its output
strict_lint = true               # style lint warnings become errors
allow_lints = ["no-ts-comment"]  # only when breaking the rule is the lesson
extra_files = ["shapes.ts"]      # sibling modules the exercise imports

[exercises.error_notes]          # a help line for the error you expect learners to hit
TS2339 = "`radius` only exists on circles. Check `kind` before reading it."
```

`error_notes` is the main tool to make an exercise friendly. You know which error
the learner will see first, so explain it in their terms. Keys are TypeScript
error codes (`TS2322`) or lint rule names. Common errors already have a generic
note in [`src/notes.ts`](src/notes.ts).

## Pull requests

Small fixes can go straight to a pull request. For anything bigger, open an issue
first. When you change an exercise, check whether its solution, hint and error
notes need to change too, and run `node src/main.ts dev check` before pushing.
