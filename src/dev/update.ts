// `tslings dev update`: keep the TypeScript setup of community exercises in
// sync with this version of tslings. In the tslings repository, regenerate
// `info.toml` from `curriculum/`.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { INFO_FILE_NAME, loadInfoFile } from "../info-file.ts";
import { isRecord, type JsonObject, readJsonObject } from "../json.ts";
import { packageFile, TYPES_NODE_VERSION, TYPESCRIPT_VERSION } from "../package.ts";
import { write } from "../term.ts";
import { REPO_MARKER } from "../workspace.ts";
import { assembleInfoToml, hasCurriculum } from "./curriculum.ts";

const PACKAGE_JSON = "package.json";
const TYPE_ASSERT = "type-assert.ts";

/** `package.json` with the TypeScript and `@types/node` versions tslings checks with. */
function updatedPackageJson(current: JsonObject): JsonObject {
  const devDependencies = isRecord(current.devDependencies) ? current.devDependencies : {};
  const imports = isRecord(current.imports) ? current.imports : {};
  return {
    ...current,
    type: "module",
    imports: { ...imports, "#type-assert": imports["#type-assert"] ?? `./${TYPE_ASSERT}` },
    devDependencies: { ...devDependencies, "@types/node": TYPES_NODE_VERSION, typescript: TYPESCRIPT_VERSION },
  };
}

function expectedTypeAssert(): string {
  return readFileSync(packageFile("templates", TYPE_ASSERT), "utf8");
}

/** The setup files that `tslings dev update` would change. */
export function outdatedSetupFiles(): string[] {
  const outdated: string[] = [];
  if (!existsSync(PACKAGE_JSON)) {
    outdated.push(PACKAGE_JSON);
  } else {
    const current = readJsonObject(PACKAGE_JSON);
    if (JSON.stringify(updatedPackageJson(current)) !== JSON.stringify(current)) outdated.push(PACKAGE_JSON);
  }
  if (!existsSync(TYPE_ASSERT) || readFileSync(TYPE_ASSERT, "utf8") !== expectedTypeAssert()) {
    outdated.push(TYPE_ASSERT);
  }
  return outdated;
}

export function update(): void {
  // In the tslings repository, `info.toml` is the generated file, so it may not exist yet.
  if (existsSync(REPO_MARKER)) {
    if (!hasCurriculum(".")) throw new Error("The `curriculum/` directory with `ORDER.txt` is missing");
    const { text, nExercises, nChapters } = assembleInfoToml(".");
    writeFileSync(INFO_FILE_NAME, text);
    write(`Updated \`${INFO_FILE_NAME}\` (${nExercises} exercises from ${nChapters} chapter files)\n`);
    return;
  }

  if (!loadInfoFile().local) {
    throw new Error(`There's no \`${INFO_FILE_NAME}\` file in the current directory. \`tslings dev update\` is for community exercises`);
  }

  const outdated = outdatedSetupFiles();
  if (outdated.includes(PACKAGE_JSON)) {
    const current = existsSync(PACKAGE_JSON) ? readJsonObject(PACKAGE_JSON) : { private: true };
    writeFileSync(PACKAGE_JSON, `${JSON.stringify(updatedPackageJson(current), null, 2)}\n`);
    write(`Updated \`${PACKAGE_JSON}\`\n`);
  }
  if (outdated.includes(TYPE_ASSERT)) {
    writeFileSync(TYPE_ASSERT, expectedTypeAssert());
    write(`Updated \`${TYPE_ASSERT}\`\n`);
  }
  if (outdated.length === 0) write("Everything is up to date\n");
}
