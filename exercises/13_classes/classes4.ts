// An `abstract` class is a base class that can't be instantiated on its own. It implements the
// shared logic and declares `abstract` members that each subclass must provide. Forget one,
// and TypeScript reports it on the subclass.
//
// With `noImplicitOverride` (on in tslings, and in many strict codebases), a method that
// replaces a method of the base class must say so with `override`. It protects against typos
// and renames: an `override` method whose base method doesn't exist (anymore) is an error,
// instead of a new method that nothing calls.
//
// Both subclasses below have a bug the compiler catches. Fix them, and leave `Exporter` as
// it is.

import { test } from "node:test";
import assert from "node:assert/strict";

type Row = Readonly<Record<string, string | number>>;

abstract class Exporter {
  abstract readonly extension: string;

  /** Formats one row. Every exporter does it its own way. */
  protected abstract formatRow(row: Row, columns: readonly string[]): string;

  /** An optional first line. The default is no header. */
  protected header(_columns: readonly string[]): string | undefined {
    return undefined;
  }

  export(rows: readonly Row[]): string {
    const columns = Object.keys(rows[0] ?? {});
    const header = this.header(columns);
    const lines = rows.map((row) => this.formatRow(row, columns));
    return (header === undefined ? lines : [header, ...lines]).join("\n");
  }
}

class CsvExporter extends Exporter {
  readonly extension = "csv";

  // TODO: This method replaces a method of `Exporter`. Say so.
  protected header(columns: readonly string[]): string {
    return columns.join(",");
  }

  protected formatRow(row: Row, columns: readonly string[]): string {
    return columns.map((column) => String(row[column] ?? "")).join(",");
  }
}

class JsonLinesExporter extends Exporter {
  readonly extension = "jsonl";

  // TODO: Which abstract member of `Exporter` is this class supposed to implement?
  protected override formatLine(row: Row): string {
    return JSON.stringify(row);
  }
}

// Don't change the tests below.

const rows: Row[] = [
  { id: 1, name: "Ada", plan: "pro" },
  { id: 2, name: "Grace", plan: "free" },
];

test("CSV has a header line", () => {
  const csv = new CsvExporter();
  assert.equal(csv.export(rows), "id,name,plan\n1,Ada,pro\n2,Grace,free");
  assert.equal(csv.extension, "csv");
});

test("JSON Lines has one object per line", () => {
  const jsonl = new JsonLinesExporter();
  assert.equal(
    jsonl.export(rows),
    '{"id":1,"name":"Ada","plan":"pro"}\n{"id":2,"name":"Grace","plan":"free"}',
  );
  assert.equal(jsonl.extension, "jsonl");
});

test("a new exporter only has to implement the abstract members", () => {
  // No `override` here: implementing an `abstract` member doesn't need it.
  class TsvExporter extends Exporter {
    readonly extension = "tsv";

    protected formatRow(row: Row, columns: readonly string[]): string {
      return columns.map((column) => String(row[column] ?? "")).join("\t");
    }
  }
  assert.equal(new TsvExporter().export(rows), "1\tAda\tpro\n2\tGrace\tfree");
});

test("exporters can be used through the base class", () => {
  const exporters: Exporter[] = [new CsvExporter(), new JsonLinesExporter()];
  assert.deepEqual(
    exporters.map((exporter) => `report.${exporter.extension}`),
    ["report.csv", "report.jsonl"],
  );
});
