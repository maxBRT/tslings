// In the tslings repository, `info.toml` is generated from `curriculum/`: a
// header (`_header.toml`) followed by one file per chapter, in the order of
// `curriculum/ORDER.txt`. Several people can then edit chapters at the same
// time without touching one big file.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "smol-toml";
import { CURRENT_FORMAT_VERSION, parseInfoFile } from "../info-file.js";
export const CURRICULUM_DIR = "curriculum";
const HEADER_FILE = "_header.toml";
const ORDER_FILE = "ORDER.txt";
const HEADER_KEYS = ["format_version", "welcome_message", "final_message"];
const GENERATED_NOTICE = `# This file is generated from the files in \`curriculum/\` by \`node scripts/assemble-info.ts\`
# (or \`tslings dev update\` in the tslings repository). Edit those files instead.
`;
/** Whether `root` has the curriculum files `info.toml` is generated from. */
export function hasCurriculum(root) {
    return existsSync(join(root, CURRICULUM_DIR, ORDER_FILE));
}
/** Read `curriculum/ORDER.txt`: one chapter file name per line; blank lines and `#` comments are ignored. */
export function readOrder(root) {
    return readFileSync(join(root, CURRICULUM_DIR, ORDER_FILE), "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "" && !line.startsWith("#"));
}
/** Build the content of `info.toml`, and validate every exercise on the way. Throws on problems. */
export function assembleInfoToml(root) {
    const dir = join(root, CURRICULUM_DIR);
    const read = (file) => {
        const path = join(dir, file);
        if (!existsSync(path))
            throw new Error(`The file ${CURRICULUM_DIR}/${file} doesn't exist`);
        return readFileSync(path, "utf8");
    };
    const header = read(HEADER_FILE);
    const headerTable = parseToml(header, HEADER_FILE);
    for (const key of Object.keys(headerTable)) {
        if (!HEADER_KEYS.includes(key)) {
            throw new Error(`${CURRICULUM_DIR}/${HEADER_FILE} may only contain ${HEADER_KEYS.map((name) => `\`${name}\``).join(", ")}, found \`${key}\``);
        }
    }
    if (headerTable.format_version !== CURRENT_FORMAT_VERSION) {
        throw new Error(`\`format_version\` in ${CURRICULUM_DIR}/${HEADER_FILE} must be ${CURRENT_FORMAT_VERSION}`);
    }
    const order = readOrder(root);
    const duplicate = order.find((file, index) => order.indexOf(file) !== index);
    if (duplicate !== undefined)
        throw new Error(`${duplicate} is listed twice in ${CURRICULUM_DIR}/${ORDER_FILE}`);
    const unlisted = readdirSync(dir).filter((file) => file.endsWith(".toml") && file !== HEADER_FILE && !order.includes(file));
    if (unlisted.length > 0) {
        throw new Error(`Not listed in ${CURRICULUM_DIR}/${ORDER_FILE}: ${unlisted.map((file) => `${CURRICULUM_DIR}/${file}`).join(", ")}`);
    }
    let text = `${GENERATED_NOTICE}\n${header.trim()}\n`;
    for (const file of order) {
        const chapter = read(file);
        const table = parseToml(chapter, file);
        const keys = Object.keys(table);
        if (keys.length !== 1 || keys[0] !== "exercises" || !Array.isArray(table.exercises) || table.exercises.length === 0) {
            throw new Error(`${CURRICULUM_DIR}/${file} must only contain \`[[exercises]]\` tables (and their \`[exercises.error_notes]\`)`);
        }
        // Validate the chapter alone, so errors name the right file.
        try {
            const { exercises } = parseInfoFile(`format_version = ${CURRENT_FORMAT_VERSION}\n${chapter}`, { strict: true });
            const withoutDir = exercises.find((exercise) => exercise.dir === undefined);
            if (withoutDir !== undefined)
                throw new Error(`The exercise \`${withoutDir.name}\` has no \`dir\``);
        }
        catch (error) {
            throw new Error(`Invalid exercise metadata in ${CURRICULUM_DIR}/${file}`, { cause: error });
        }
        text += `\n# ${"-".repeat(20)} ${file} ${"-".repeat(20)}\n\n${chapter.trim()}\n`;
    }
    const info = parseInfoFile(text, { strict: true });
    const names = new Set();
    for (const exercise of info.exercises) {
        if (names.has(exercise.name))
            throw new Error(`The exercise name \`${exercise.name}\` is used more than once`);
        names.add(exercise.name);
    }
    return { text, nExercises: info.exercises.length, nChapters: order.length };
}
function parseToml(text, file) {
    try {
        return parse(text);
    }
    catch (error) {
        throw new Error(`Failed to parse ${CURRICULUM_DIR}/${file}`, { cause: error });
    }
}
