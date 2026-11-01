# Changelog

## 0.1.0 (unreleased)

First version of tslings, forked from [rustlings](https://github.com/rust-lang/rustlings) 6.5.0.

- The CLI is rewritten in TypeScript and keeps rustlings' features: watch mode, list
  mode, hints, reset, check-all, solutions after each exercise, editor integration,
  community exercises with `dev new`, `dev check` and `dev update`.
- Exercises are type-checked with TypeScript 7, linted with rules that block `any`,
  `as`, `!` and `@ts-ignore`, and run with Node's built-in TypeScript support and
  test runner.
- Errors are rendered in the style of the Rust compiler, with plain-English help
  notes, and exercises can add their own notes for the errors they expect.
- A new set of exercises covering TypeScript, from inference to type-level programming.

The rustlings changelog is at
https://github.com/rust-lang/rustlings/blob/main/CHANGELOG.md.
