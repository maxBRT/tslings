# Lint

The type checker answers one question: do the types fit? A linter looks for code that type-checks
and is still likely wrong. Real projects run one in CI, usually ESLint with `typescript-eslint`
or a faster newcomer like Biome or oxlint, and a lint error blocks the merge just like a failing
test does.

tslings has a small linter of its own. The cheat rules (`no-explicit-any`, `no-type-assertion`,
`no-non-null-assertion`, `no-ts-comment`) have been errors since the first chapter, because each
one switches off a check TypeScript would otherwise do for you. The style rules (`no-var`,
`eqeqeq`, `prefer-const`) were only warnings so far. In this chapter they are errors too.

None of these rules is about taste. Each one exists because of a bug that kept happening: loop
closures sharing one `var`, `==` deciding that `0` equals `""`, a `!` turning a missing value
into `NaN` three functions later. When a rule fires, ask what bug it is pointing at before you
make it go away.

## Further information

- [`let`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let) and [`const`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const) on MDN
- [Equality comparisons and sameness](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness)
- [typescript-eslint](https://typescript-eslint.io/)
- [ESLint rules reference](https://eslint.org/docs/latest/rules/)
