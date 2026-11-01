# tslings

<img src="assets/favicon.svg" alt="TypeScript logo" width="64" align="right">

Small exercises to get you used to reading and writing idiomatic TypeScript.

tslings is a fork of [rustlings](https://github.com/rust-lang/rustlings), rebuilt for
TypeScript. Each exercise is a small file that doesn't type-check or fails its tests.
You fix it, save, and tslings checks it again right away. When it passes, you move on.

The exercises are new, not translations of the Rust ones. They cover what makes
TypeScript its own language: narrowing, discriminated unions, `unknown` and type
guards, generics, mapped, conditional and template literal types, `satisfies`,
branded types, `using`, and type-level tests. The goal is to write TypeScript the
way experienced developers write it today, not JavaScript with annotations.

## Getting started

You need [Node.js](https://nodejs.org) 22.18 or newer (24 recommended). Node runs
TypeScript files directly, so there is no build step for your exercises.

Install tslings:

```sh
npm install --global github:maxBRT/tslings
```

Create your exercise folder and start:

```sh
tslings init
cd tslings
tslings
```

`tslings init` creates a `tslings/` folder with the exercises, a strict
`tsconfig.json`, and a `package.json`. It also runs `npm install` so your editor
picks up TypeScript and the Node types. Open that folder in your editor.

## Working through the exercises

Running `tslings` starts the watch mode. It shows the current exercise and its
errors, and re-checks the file every time you save it. Each check has three steps:

1. **Type-check** with TypeScript 7, using strict settings (`noUncheckedIndexedAccess`,
   `exactOptionalPropertyTypes`, `erasableSyntaxOnly` and friends).
2. **Lint.** A few rules stop you from silencing the checker: no `any`, no `as`
   casts (`as const` is fine), no non-null `!`, no `@ts-ignore`. They would let
   you pass an exercise without learning anything.
3. **Run** the exercise's tests with Node's built-in test runner, or run the file
   and show its output.

Errors look like Rust compiler errors: the location, the code with the faulty span
underlined, and a `help:` line in plain English. For the error an exercise is built
around, the help line is written specifically for that exercise.

Keys in watch mode:

| key | action |
|-----|--------|
| `n` | next exercise (once the current one is done) |
| `h` | show a hint |
| `l` | list all exercises: search, filter, jump to any of them |
| `x` | reset the current exercise |
| `q` | quit |

When you finish an exercise, its reference solution is copied to `solutions/`.
Compare it with yours; there is often more than one good answer.

Other commands:

```sh
tslings run [name]      # check one exercise (the current one by default)
tslings hint [name]     # print a hint
tslings reset <name>    # restore an exercise to its original state
tslings check-all       # re-check every exercise
tslings --help
```

If file watching doesn't work on your system, use `tslings --manual-run` and
press `r` to re-check.

### Editor integration

In VS Code's terminal, tslings opens the current exercise in the editor for you.
It does the same in Zellij. For other editors, pass `--edit-cmd`, for example
`tslings --edit-cmd "code"`. The command must not block, so `vim` won't work there.

## Topics

| # | topic |
|---|-------|
| 0 | intro |
| 1 | variables, inference and literal types |
| 2 | functions |
| 3 | primitives and literal types |
| 4 | arrays and tuples |
| 5 | objects, interfaces and structural typing |
| 6 | Map, Set, Record |
| 7 | unions and narrowing |
| 8 | discriminated unions and exhaustiveness |
| 9 | null and undefined |
| 10 | `unknown` and type guards |
| 11 | error handling |
| 12 | generics |
| 13 | classes |
| 14 | modules |
| 15 | `keyof` and `typeof` |
| 16 | utility types |
| 17 | mapped types |
| 18 | conditional types |
| 19 | template literal types |
| 20 | async code |
| 21 | iterators and generators |
| 22 | advanced patterns: brands, `satisfies`, overloads, `using`, `NoInfer` |
| 23 | testing values and types |
| 24 | lint rules |

Four quizzes along the way mix the topics before them.

## Community exercises

You can write your own set of exercises with the same tool. `tslings dev new
my-exercises` creates the skeleton, and `tslings dev check` makes sure every
exercise fails before it's solved and every solution passes. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## Credits

tslings is built on the design of [rustlings](https://github.com/rust-lang/rustlings)
by Carol Nichols, mo8it and the rustlings contributors. The watch mode, the list
view and the whole "fix a small broken file" idea come from there. Both projects
are MIT licensed.
