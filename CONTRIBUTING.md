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
properties). `npm run build` compiles it to `dist/`. That folder is committed, so
installing from GitHub (see the README) works without a build step: run
`npm run build` and commit `dist/` along with your changes to `src/`. CI fails
when the two don't match.

## How an exercise is checked

1. **Type-check** the file with TypeScript 7 and the strict settings in
   [`templates/tsconfig.json`](templates/tsconfig.json).
2. **Lint.** These rules are always errors because they let learners silence the
   checker: `no-explicit-any`, `no-unsafe-any` (an `any` nobody wrote, from
   `JSON.parse` or `new Map()`, flowing into an unannotated variable, a `return` or
   an argument; `const data: unknown = JSON.parse(text)` is fine),
   `no-type-assertion` (`as const` is allowed), `no-non-null-assertion` (also
   `let x!: T`), `no-ts-comment`. The style rules `no-var`, `eqeqeq` and
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
- Add the metadata to `info.toml`, then run `node src/main.ts dev check`. Read the
  output of the unsolved exercise as a learner would: `node src/main.ts run <name>`.

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
extra_files = ["shapes.ts"]      # sibling modules the exercise imports (see below)

[exercises.error_notes]          # a help line for the error you expect learners to hit
TS2339 = "`radius` only exists on circles. Check `kind` before reading it."
"TS2322 'undefined'" = "`find` may come back empty-handed: say so in the return type."
```

Extra files are provided, not edited: tslings writes them again before each check,
so editing one can't solve an exercise. Put the same file in `exercises/<dir>/`
and `solutions/<dir>/` (`dev check` compares them), and start it with
`// Provided by tslings and restored before each check, so don't edit this file.`

`error_notes` is the main tool to make an exercise friendly. You know which error
the learner will see first, so explain it in their terms. Keys are TypeScript
error codes (`TS2322`) or lint rule names. Common errors already have a generic
note in [`src/notes.ts`](src/notes.ts).

When one code covers several mistakes, add a message filter after the code and a
space: `"TS2339 radius"` or `"TS2339 'radius'"` (quotes around the filter are
optional, and let it start or end with a space). That note is only shown when the
error's message contains the filter, `Property 'radius' does not exist...` here.
The message chain under it counts too. When several keys match, the one with the
longest filter wins, and the plain `TS2339` is the fallback. TOML needs quotes
around keys with spaces. `dev check` rejects malformed keys and two keys with the
same filter.

## Pull requests

Small fixes can go straight to a pull request. For anything bigger, open an issue
first. When you change an exercise, check whether its solution, hint and error
notes need to change too, and run `node src/main.ts dev check` before pushing.
