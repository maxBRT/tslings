# Discriminated unions

A discriminated union (also called a tagged union) is a union of object types
that share one property with a different literal value in each member, such as
`{ kind: "text"; body: string } | { kind: "image"; url: string }`. Checking that
property narrows the whole object, so each branch sees exactly the fields of
its member. Where other languages reach for sum types, enums with data or class
hierarchies, TypeScript code uses discriminated unions. They're plain objects, so
they go through JSON unchanged, and the compiler still checks every place that
reads them.

They're the usual way to model state. Instead of one object with optional fields
(`isLoading`, `data?`, `error?`) that allows impossible combinations, each state
becomes a member that holds only its own data. Add an exhaustiveness check
(`x satisfies never` in the `default` of a `switch`), and adding a member to the
union makes the compiler point at every `switch` that must handle it. Reducers
and event handlers follow the same pattern, with a union of actions and one
`switch` over them.

## Further information

- [Discriminated unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
- [The `never` type and exhaustiveness checking](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking)
- [Narrowing destructured discriminated unions (TypeScript 4.6)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-6.html#control-flow-analysis-for-destructured-discriminated-unions)
- [The `satisfies` operator (TypeScript 4.9)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator)
- [Extracting state logic into a reducer (React docs)](https://react.dev/learn/extracting-state-logic-into-a-reducer)
