// Command-line arguments: parsing (with `node:util` parseArgs) and help texts
// in the style of clap, the Rust library rustlings uses.
import { parseArgs } from "node:util";
import { VERSION } from "./package.js";
import { paint, stderrColor, stdoutColor } from "./term.js";
const NAME_ARG = { name: "NAME", required: false, help: "The name of the exercise" };
const DEV = {
    name: "dev",
    about: "Commands for developing (community) tslings exercises",
    positionals: [],
    options: [],
    subcommands: [
        {
            name: "new",
            about: "Create a new project for community exercises",
            positionals: [{ name: "PATH", required: true, help: "The path to create the project in" }],
            options: [{ long: "no-git", help: "Don't try to initialize a Git repository in the project directory" }],
            subcommands: [],
        },
        {
            name: "check",
            about: "Run checks on the exercises",
            positionals: [],
            options: [{ long: "require-solutions", short: "r", help: "Require that every exercise has a solution" }],
            subcommands: [],
        },
        {
            name: "update",
            about: "Update the TypeScript setup of the exercises (`package.json`, `type-assert.ts`) to this version of tslings",
            positionals: [],
            options: [],
            subcommands: [],
        },
    ],
};
const ROOT = {
    name: "tslings",
    about: "tslings is a collection of small exercises to get you used to writing and reading TypeScript code",
    positionals: [],
    options: [
        {
            long: "no-editor",
            help: "Disable automatic opening of the current file in VS Code or Zellij. Ignores `--edit-cmd`",
        },
        {
            long: "edit-cmd",
            value: "EDIT_CMD",
            help: "Open the current exercise by running `EDIT_CMD EXERCISE_PATH`",
            longHelp: `Open the current exercise by running \`EDIT_CMD EXERCISE_PATH\`.
The command is not allowed to block (e.g. \`vim\`).
It should communicate with an editor in a different process.
\`EDIT_CMD\` can contain arguments like \`--edit-cmd "PROGRAM -x --arg1"\`.
The current exercise's path is added by tslings as the last argument.
\`--edit-cmd\` is ignored in VS Code.

Example: \`--edit-cmd "code"\` (default behavior if running in a VS Code terminal)`,
        },
        {
            long: "manual-run",
            help: "Manually run the current exercise using `r` in the watch mode. Only use this if tslings fails to detect exercise file changes",
        },
    ],
    subcommands: [
        {
            name: "init",
            about: "Initialize the official tslings exercises",
            positionals: [],
            options: [{ long: "no-install", help: "Don't run `npm install` (it only adds editor support, the exercises work without it)" }],
            subcommands: [],
        },
        {
            name: "run",
            about: "Run a single exercise. Runs the next pending exercise if the exercise name is not specified",
            positionals: [NAME_ARG],
            options: [],
            subcommands: [],
        },
        {
            name: "check-all",
            about: "Check all the exercises, marking them as done or pending accordingly",
            positionals: [],
            options: [],
            subcommands: [],
        },
        {
            name: "reset",
            about: "Reset a single exercise",
            positionals: [{ ...NAME_ARG, required: true }],
            options: [],
            subcommands: [],
        },
        {
            name: "hint",
            about: "Show a hint. Shows the hint of the next pending exercise if the exercise name is not specified",
            positionals: [NAME_ARG],
            options: [],
            subcommands: [],
        },
        DEV,
    ],
};
const HELP = { long: "help", short: "h", help: "Print help" };
const VERSION_OPTION = { long: "version", short: "V", help: "Print version" };
const HELP_COMMAND_ABOUT = "Print this message or the help of the given subcommand(s)";
class UsageError extends Error {
    usage;
    constructor(message, usage) {
        super(message);
        this.usage = usage;
    }
}
export function parseCliArgs(argv) {
    try {
        return parseRoot(argv);
    }
    catch (error) {
        if (error instanceof UsageError) {
            const color = stderrColor;
            const stderr = `${paint(["bold", "red"], "error:", color)} ${error.message}\n\n${error.usage}\n\nFor more information, try '${paint("bold", "--help", color)}'.\n`;
            return { kind: "exit", code: 2, stderr };
        }
        throw error;
    }
}
function parseRoot(argv) {
    const parsed = parseLevel(ROOT, [ROOT.name], argv, true);
    if (parsed.flags.has("help"))
        return printHelp(ROOT, [ROOT.name], parsed.flags.has("long-help"));
    if (parsed.flags.has("version"))
        return { kind: "exit", code: 0, stdout: `tslings ${VERSION}\n` };
    const globals = {
        noEditor: parsed.flags.has("no-editor"),
        editCmd: parsed.values.get("edit-cmd"),
        manualRun: parsed.flags.has("manual-run"),
    };
    const args = (command) => ({ kind: "args", args: { command, ...globals } });
    const [name] = parsed.positionals;
    if (name === undefined)
        return args({ kind: "watch" });
    if (name === "help")
        return helpCommand(parsed.rest);
    const spec = ROOT.subcommands.find((command) => command.name === name);
    if (spec === undefined) {
        throw new UsageError(`unrecognized subcommand '${paint("yellow", name, stderrColor)}'`, usage(ROOT, [ROOT.name]));
    }
    const path = [ROOT.name, spec.name];
    if (spec === DEV) {
        const dev = parseLevel(DEV, path, parsed.rest, false);
        if (dev.flags.has("help"))
            return printHelp(DEV, path, dev.flags.has("long-help"));
        const [devName] = dev.positionals;
        if (devName === undefined) {
            return { kind: "exit", code: 2, stderr: helpText(DEV, path, false, stderrColor) };
        }
        if (devName === "help")
            return helpCommand(["dev", ...dev.rest]);
        const devSpec = DEV.subcommands.find((command) => command.name === devName);
        if (devSpec === undefined) {
            throw new UsageError(`unrecognized subcommand '${paint("yellow", devName, stderrColor)}'`, usage(DEV, path));
        }
        const devPath = [...path, devSpec.name];
        const sub = parseLevel(devSpec, devPath, dev.rest, false);
        if (sub.flags.has("help"))
            return printHelp(devSpec, devPath, sub.flags.has("long-help"));
        switch (devSpec.name) {
            case "new":
                return args({ kind: "dev-new", path: sub.positionals[0] ?? "", noGit: sub.flags.has("no-git") });
            case "check":
                return args({ kind: "dev-check", requireSolutions: sub.flags.has("require-solutions") });
            default:
                return args({ kind: "dev-update" });
        }
    }
    const sub = parseLevel(spec, path, parsed.rest, false);
    if (sub.flags.has("help"))
        return printHelp(spec, path, sub.flags.has("long-help"));
    const [first] = sub.positionals;
    switch (spec.name) {
        case "init":
            return args({ kind: "init", noInstall: sub.flags.has("no-install") });
        case "run":
            return args({ kind: "run", name: first });
        case "check-all":
            return args({ kind: "check-all" });
        case "reset":
            return args({ kind: "reset", name: first ?? "" });
        default:
            return args({ kind: "hint", name: first });
    }
}
/** `tslings help [COMMAND]...` */
function helpCommand(names) {
    let spec = ROOT;
    const path = [ROOT.name];
    for (const name of names) {
        const sub = spec.subcommands.find((command) => command.name === name);
        if (sub === undefined) {
            throw new UsageError(`unrecognized subcommand '${paint("yellow", name, stderrColor)}'`, usage(spec, path));
        }
        spec = sub;
        path.push(name);
    }
    return printHelp(spec, path, true);
}
/**
 * Parse the arguments of one command level. Options must come before the
 * subcommand name; everything after it goes to `rest`.
 */
function parseLevel(spec, path, argv, isRoot) {
    const known = [...spec.options, HELP, ...(isRoot ? [VERSION_OPTION] : [])];
    const options = {};
    for (const option of known) {
        options[option.long] = { type: option.value === undefined ? "boolean" : "string", ...(option.short === undefined ? {} : { short: option.short }) };
    }
    const { tokens } = parseArgs({ args: [...argv], options, allowPositionals: true, strict: false, tokens: true });
    const flags = new Set();
    const values = new Map();
    const positionals = [];
    const usageText = usage(spec, path);
    const hasSubcommands = spec.subcommands.length > 0;
    for (const token of tokens) {
        if (token.kind === "option-terminator")
            continue;
        if (token.kind === "positional") {
            if (hasSubcommands) {
                return { flags, values, positionals: [token.value], rest: argv.slice(token.index + 1) };
            }
            positionals.push(token.value);
            continue;
        }
        const option = known.find((candidate) => candidate.long === token.name);
        if (option === undefined) {
            throw new UsageError(`unexpected argument '${paint("yellow", token.rawName, stderrColor)}' found`, usageText);
        }
        if (option.value === undefined) {
            if (token.value !== undefined) {
                throw new UsageError(`unexpected value '${paint("yellow", token.value, stderrColor)}' for '${token.rawName}' found; no more were expected`, usageText);
            }
            flags.add(option.long);
            if (option === HELP && token.rawName === "--help")
                flags.add("long-help");
        }
        else {
            if (token.value === undefined) {
                throw new UsageError(`a value is required for '${paint("yellow", `--${option.long} <${option.value}>`, stderrColor)}' but none was supplied`, usageText);
            }
            values.set(option.long, token.value);
        }
    }
    if (flags.has("help") || flags.has("version"))
        return { flags, values, positionals, rest: [] };
    const missing = spec.positionals.slice(positionals.length).filter((positional) => positional.required);
    if (missing.length > 0) {
        throw new UsageError(`the following required arguments were not provided:\n  ${missing.map((positional) => paint("green", `<${positional.name}>`, stderrColor)).join("\n  ")}`, `${paint(["bold", "underline"], "Usage:", stderrColor)} ${path.join(" ")} ${spec.positionals.map(positionalUsage).join(" ")}`.trimEnd());
    }
    const extra = positionals[spec.positionals.length];
    if (extra !== undefined) {
        throw new UsageError(`unexpected argument '${paint("yellow", extra, stderrColor)}' found`, usageText);
    }
    return { flags, values, positionals, rest: [] };
}
function positionalUsage(positional) {
    return positional.required ? `<${positional.name}>` : `[${positional.name}]`;
}
function usage(spec, path, color = stderrColor) {
    const parts = [...path];
    if (spec.options.length > 0 || path.length === 1)
        parts.push("[OPTIONS]");
    parts.push(...spec.positionals.map(positionalUsage));
    if (spec.subcommands.length > 0)
        parts.push(path.length === 1 ? "[COMMAND]" : "<COMMAND>");
    return `${paint(["bold", "underline"], "Usage:", color)} ${parts.join(" ")}`;
}
function printHelp(spec, path, long) {
    return { kind: "exit", code: 0, stdout: helpText(spec, path, long, stdoutColor) };
}
/** A help text like clap's: about, usage, commands, arguments, options. */
export function helpText(spec, path, long, color) {
    const heading = (text) => paint(["bold", "underline"], text, color);
    const bold = (text) => paint("bold", text, color);
    const sections = [long ? (spec.longAbout ?? spec.about) : spec.about, usage(spec, path, color)];
    if (spec.subcommands.length > 0) {
        const commands = [...spec.subcommands.map((command) => [command.name, command.about]), ["help", HELP_COMMAND_ABOUT]];
        const width = Math.max(...commands.map(([name]) => name.length));
        sections.push(`${heading("Commands:")}\n${commands.map(([name, about]) => `  ${bold(name.padEnd(width))}  ${about}`).join("\n")}`);
    }
    if (spec.positionals.length > 0) {
        const width = Math.max(...spec.positionals.map((positional) => positionalUsage(positional).length));
        const lines = spec.positionals.map((positional) => `  ${bold(positionalUsage(positional).padEnd(width))}  ${positional.help}`);
        sections.push(`${heading("Arguments:")}\n${lines.join("\n")}`);
    }
    const options = [...spec.options, HELP, ...(path.length === 1 ? [VERSION_OPTION] : [])];
    const flag = (option) => `${option.short === undefined ? "    " : `-${option.short}, `}--${option.long}${option.value === undefined ? "" : ` <${option.value}>`}`;
    const hasLongHelp = options.some((option) => option.longHelp !== undefined);
    const optionHelp = (option) => option === HELP && hasLongHelp && !long ? "Print help (see more with '--help')" : option.help;
    if (long && hasLongHelp) {
        const lines = options.map((option) => {
            const text = (option.longHelp ?? optionHelp(option)).split("\n").map((line) => (line === "" ? "" : `          ${line}`));
            return `  ${bold(flag(option))}\n${text.join("\n")}`;
        });
        sections.push(`${heading("Options:")}\n${lines.join("\n\n")}`);
    }
    else {
        const width = Math.max(...options.map((option) => flag(option).length));
        const lines = options.map((option) => `  ${bold(flag(option).padEnd(width))}  ${optionHelp(option)}`);
        sections.push(`${heading("Options:")}\n${lines.join("\n")}`);
    }
    return `${sections.join("\n\n")}\n`;
}
