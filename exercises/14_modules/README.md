# Modules

Every TypeScript file that imports or exports something is an ES module with its own scope.
What a module doesn't export stays private to it, and TypeScript checks each import against the
other file's exports, types included. Rename an export and every file that still uses the old
name stops compiling, which beats finding out in production.

In tslings, Node runs your `.ts` files directly by erasing their types, with no build step.
That shapes how imports are written: real file names with their `.ts` extension, and
`import type` for anything that is only a type, so that nothing is left pointing at a type once
the types are gone. The `verbatimModuleSyntax` option makes TypeScript enforce this.

Most teams prefer named exports to default exports, and explicit re-exports to `export *`. Both
keep a module's public API written down in one place, under one name.

## Further information

- [Modules](https://www.typescriptlang.org/docs/handbook/2/modules.html)
- [Modules reference: theory](https://www.typescriptlang.org/docs/handbook/modules/theory.html)
- [verbatimModuleSyntax](https://www.typescriptlang.org/tsconfig/#verbatimModuleSyntax)
- [Running TypeScript natively in Node.js](https://nodejs.org/api/typescript.html)
- [import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)
  and [export](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export) on MDN
