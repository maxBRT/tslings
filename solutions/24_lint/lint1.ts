// On top of the cheat rules you've met (`any`, `as`, `!`, `@ts-ignore`), tslings has style
// rules. Until now they were warnings; in this chapter they are errors, as they would be in a
// project's CI. Each one exists because of bugs it prevents, not for looks.
//
// `no-var` flags `var`. A `var` belongs to the whole function, not to the block it's written
// in, so a `var` declared in a loop is ONE variable shared by every iteration, and every closure
// created in the loop sees its last value. `let` and `const` belong to their block: each
// iteration gets its own. (`prefer-const` then asks for `const` wherever you never reassign.)

import { test } from "node:test";
import assert from "node:assert/strict";

type Row = Readonly<Record<string, string>>;
type ColumnReader = (row: Row) => string;

// Builds one reader per column, for a CSV export.
function makeColumnReaders(columns: readonly string[]): ColumnReader[] {
  // `const` still lets you push: it stops reassigning the variable, not changing the array.
  const readers: ColumnReader[] = [];
  // `i` is reassigned by `i++`, so it stays `let`. A `let` in a `for` header gets a fresh copy
  // for each iteration, which is what closures created in the loop need.
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i] ?? "";
    readers.push((row) => row[column] ?? "");
  }
  return readers;
}

// The same function without an index: `columns.map((column) => (row) => row[column] ?? "")`.
// With `map`, each callback has its own parameter, so the bug can't happen at all.

function toCsvLine(row: Row, readers: readonly ColumnReader[]): string {
  return readers.map((read) => read(row)).join(",");
}

// Don't change the tests below.

test("each reader reads its own column", () => {
  const readers = makeColumnReaders(["id", "email", "plan"]);
  const row = { id: "usr_ada", email: "ada@example.com", plan: "pro" };
  assert.equal(toCsvLine(row, readers), "usr_ada,ada@example.com,pro");
});
