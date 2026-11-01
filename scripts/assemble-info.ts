// Build `info.toml` from the files in `curriculum/`.
//
//   node scripts/assemble-info.ts          # write info.toml
//   node scripts/assemble-info.ts --check  # fail if info.toml is outdated
//
// `info.toml` = `curriculum/_header.toml` (format version, welcome and final
// messages) followed by the chapter files listed in `curriculum/ORDER.txt`.
// Every exercise is validated on the way: required fields (`name`, `dir`,
// `hint`), field types, unknown keys and unique names.
// `tslings dev update` does the same in the tslings repository.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { assembleInfoToml } from "../src/dev/curriculum.ts";
import { formatError } from "../src/errors.ts";
import { stderrColor } from "../src/term.ts";

const { values } = parseArgs({ options: { check: { type: "boolean", default: false } } });
const root = resolve(import.meta.dirname, "..");
const infoPath = join(root, "info.toml");

try {
  const { text, nExercises, nChapters } = assembleInfoToml(root);
  if (values.check) {
    if (!existsSync(infoPath) || readFileSync(infoPath, "utf8") !== text) {
      console.error("info.toml is outdated. Run `node scripts/assemble-info.ts` to update it.");
      process.exitCode = 1;
    } else {
      console.log(`info.toml is up to date (${nExercises} exercises from ${nChapters} chapter files)`);
    }
  } else {
    writeFileSync(infoPath, text);
    console.log(`Wrote info.toml: ${nExercises} exercises from ${nChapters} chapter files`);
  }
} catch (error) {
  process.stderr.write(formatError(error, stderrColor));
  process.exitCode = 1;
}
