// On top of the cheat rules you've met (`any`, `as`, `!`, `@ts-ignore`), tslings has style
// rules. Until now they were warnings; in this chapter they are errors, as they would be in a
// project's CI. Each one exists because of bugs it prevents, not for looks.
//
// `no-var` flags `var`. A `var` belongs to the whole function, not to the block it's written
// in, so a `var` declared in a loop is ONE variable shared by every iteration, and every closure
// created in the loop sees its last value. `let` and `const` belong to their block: each
// iteration gets its own. (`prefer-const` then asks for `const` wherever you never reassign.)
//
// TODO: Fix the lint errors. The test shows the bug that `var` causes here.

import { test } from "node:test";
import assert from "node:assert/strict";

type Row = Readonly<Record<string, string>>;
type ColumnReader = (row: Row) => string;

// Builds one reader per column, for a CSV export.
function makeColumnReaders(columns: readonly string[]): ColumnReader[] {
  var readers: ColumnReader[] = [];
  for (var i = 0; i < columns.length; i++) {
    var column = columns[i] ?? "";
    readers.push((row) => row[column] ?? "");
  }
  return readers;
}

function toCsvLine(row: Row, readers: readonly ColumnReader[]): string {
  return readers.map((read) => read(row)).join(",");
}

// Don't change the tests below.

test("each reader reads its own column", () => {
  const readers = makeColumnReaders(["id", "email", "plan"]);
  const row = { id: "usr_ada", email: "ada@example.com", plan: "pro" };
  assert.equal(toCsvLine(row, readers), "usr_ada,ada@example.com,pro");
});
