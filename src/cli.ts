// Command-line arguments: parsing (with `node:util` parseArgs) and help texts
// in the style of clap, the Rust library rustlings uses.

import { parseArgs, type ParseArgsOptionsConfig } from "node:util";
import { VERSION } from "./package.ts";
import { paint, stderrColor, stdoutColor } from "./term.ts";

export type Command =
  | { readonly kind: "watch" }
  | { readonly kind: "init"; readonly noInstall: boolean }
  | { readonly kind: "run"; readonly name: string | undefined }
  | { readonly kind: "check-all" }
  | { readonly kind: "reset"; readonly name: string }
  | { readonly kind: "hint"; readonly name: string | undefined }
  | { readonly kind: "dev-new"; readonly path: string; readonly noGit: boolean }
  | { readonly kind: "dev-check"; readonly requireSolutions: boolean }
  | { readonly kind: "dev-update" };

export interface Args {
  readonly command: Command;
  readonly noEditor: boolean;
  readonly editCmd: string | undefined;
  readonly manualRun: boolean;
}

/** Either arguments to act on, or something to print before exiting (help, version, usage error). */
export type ParseResult =
  | { readonly kind: "args"; readonly args: Args }
  | { readonly kind: "exit"; readonly code: number; readonly stdout?: string; readonly stderr?: string };

interface OptionSpec {
  readonly long: string;
  readonly short?: string;
  /** The value's placeholder, for options that take one. */
  readonly value?: string;
  readonly help: string;
  readonly longHelp?: string;
}

interface PositionalSpec {
  readonly name: string;
  readonly required: boolean;
  readonly help: string;
}

interface CommandSpec {
  readonly name: string;
  readonly about: string;
  readonly longAbout?: string;
  readonly positionals: readonly PositionalSpec[];
  readonly options: readonly OptionSpec[];
  readonly subcommands: readonly CommandSpec[];
}

const NAME_ARG: PositionalSpec = { name: "NAME", required: false, help: "The name of the exercise" };

const DEV: CommandSpec = {
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

const ROOT: CommandSpec = {
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

const HELP: OptionSpec = { long: "help", short: "h", help: "Print help" };
const VERSION_OPTION: OptionSpec = { long: "version", short: "V", help: "Print version" };
const HELP_COMMAND_ABOUT = "Print this message or the help of the given subcommand(s)";

class UsageError extends Error {
  readonly usage: string;
  constructor(message: string, usage: string) {
    super(message);
    this.usage = usage;
  }
}

export function parseCliArgs(argv: readonly string[]): ParseResult {
  try {
    return parseRoot(argv);
  } catch (error) {
    if (error instanceof UsageError) {
      const color = stderrColor;
      const stderr = `${paint(["bold", "red"], "error:", color)} ${error.message}\n\n${error.usage}\n\nFor more information, try '${paint("bold", "--help", color)}'.\n`;
      return { kind: "exit", code: 2, stderr };
    }
    throw error;
  }
}

interface Parsed {
  readonly flags: ReadonlySet<string>;
  readonly values: ReadonlyMap<string, string>;
  readonly positionals: readonly string[];
  /** Arguments after the subcommand name, for commands with subcommands. */
  readonly rest: readonly string[];
}

function parseRoot(argv: readonly string[]): ParseResult {
  const parsed = parseLevel(ROOT, [ROOT.name], argv, true);
  if (parsed.flags.has("help")) return printHelp(ROOT, [ROOT.name], parsed.flags.has("long-help"));
  if (parsed.flags.has("version")) return { kind: "exit", code: 0, stdout: `tslings ${VERSION}\n` };

  const globals = {
    noEditor: parsed.flags.has("no-editor"),
    editCmd: parsed.values.get("edit-cmd"),
    manualRun: parsed.flags.has("manual-run"),
  };
  const args = (command: Command): ParseResult => ({ kind: "args", args: { command, ...globals } });

  const [name] = parsed.positionals;
  if (name === undefined) return args({ kind: "watch" });
  if (name === "help") return helpCommand(parsed.rest);

  const spec = ROOT.subcommands.find((command) => command.name === name);
  if (spec === undefined) {
    throw new UsageError(`unrecognized subcommand '${paint("yellow", name, stderrColor)}'`, usage(ROOT, [ROOT.name]));
  }
  const path = [ROOT.name, spec.name];

  if (spec === DEV) {
    const dev = parseLevel(DEV, path, parsed.rest, false);
    if (dev.flags.has("help")) return printHelp(DEV, path, dev.flags.has("long-help"));
    const [devName] = dev.positionals;
    if (devName === undefined) {
      return { kind: "exit", code: 2, stderr: helpText(DEV, path, false, stderrColor) };
    }
    if (devName === "help") return helpCommand(["dev", ...dev.rest]);
    const devSpec = DEV.subcommands.find((command) => command.name === devName);
    if (devSpec === undefined) {
      throw new UsageError(`unrecognized subcommand '${paint("yellow", devName, stderrColor)}'`, usage(DEV, path));
    }
    const devPath = [...path, devSpec.name];
    const sub = parseLevel(devSpec, devPath, dev.rest, false);
    if (sub.flags.has("help")) return printHelp(devSpec, devPath, sub.flags.has("long-help"));
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
  if (sub.flags.has("help")) return printHelp(spec, path, sub.flags.has("long-help"));
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
function helpCommand(names: readonly string[]): ParseResult {
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
function parseLevel(spec: CommandSpec, path: readonly string[], argv: readonly string[], isRoot: boolean): Parsed {
  const known = [...spec.options, HELP, ...(isRoot ? [VERSION_OPTION] : [])];
  const options: ParseArgsOptionsConfig = {};
  for (const option of known) {
    options[option.long] = { type: option.value === undefined ? "boolean" : "string", ...(option.short === undefined ? {} : { short: option.short }) };
  }

  const { tokens } = parseArgs({ args: [...argv], options, allowPositionals: true, strict: false, tokens: true });
  const flags = new Set<string>();
  const values = new Map<string, string>();
  const positionals: string[] = [];
  const usageText = usage(spec, path);
  const hasSubcommands = spec.subcommands.length > 0;

  for (const token of tokens) {
    if (token.kind === "option-terminator") continue;
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
      if (option === HELP && token.rawName === "--help") flags.add("long-help");
    } else {
      if (token.value === undefined) {
        throw new UsageError(
          `a value is required for '${paint("yellow", `--${option.long} <${option.value}>`, stderrColor)}' but none was supplied`,
          usageText,
        );
      }
      values.set(option.long, token.value);
    }
  }

  if (flags.has("help") || flags.has("version")) return { flags, values, positionals, rest: [] };

  const missing = spec.positionals.slice(positionals.length).filter((positional) => positional.required);
  if (missing.length > 0) {
    throw new UsageError(
      `the following required arguments were not provided:\n  ${missing.map((positional) => paint("green", `<${positional.name}>`, stderrColor)).join("\n  ")}`,
      `${paint(["bold", "underline"], "Usage:", stderrColor)} ${path.join(" ")} ${spec.positionals.map(positionalUsage).join(" ")}`.trimEnd(),
    );
  }
  const extra = positionals[spec.positionals.length];
  if (extra !== undefined) {
    throw new UsageError(`unexpected argument '${paint("yellow", extra, stderrColor)}' found`, usageText);
  }
  return { flags, values, positionals, rest: [] };
}

function positionalUsage(positional: PositionalSpec): string {
  return positional.required ? `<${positional.name}>` : `[${positional.name}]`;
}

function usage(spec: CommandSpec, path: readonly string[], color: boolean = stderrColor): string {
  const parts = [...path];
  if (spec.options.length > 0 || path.length === 1) parts.push("[OPTIONS]");
  parts.push(...spec.positionals.map(positionalUsage));
  if (spec.subcommands.length > 0) parts.push(path.length === 1 ? "[COMMAND]" : "<COMMAND>");
  return `${paint(["bold", "underline"], "Usage:", color)} ${parts.join(" ")}`;
}

function printHelp(spec: CommandSpec, path: readonly string[], long: boolean): ParseResult {
  return { kind: "exit", code: 0, stdout: helpText(spec, path, long, stdoutColor) };
}

/** A help text like clap's: about, usage, commands, arguments, options. */
export function helpText(spec: CommandSpec, path: readonly string[], long: boolean, color: boolean): string {
  const heading = (text: string): string => paint(["bold", "underline"], text, color);
  const bold = (text: string): string => paint("bold", text, color);
  const sections = [long ? (spec.longAbout ?? spec.about) : spec.about, usage(spec, path, color)];

  if (spec.subcommands.length > 0) {
    const commands = [...spec.subcommands.map((command) => [command.name, command.about] as const), ["help", HELP_COMMAND_ABOUT] as const];
    const width = Math.max(...commands.map(([name]) => name.length));
    sections.push(`${heading("Commands:")}\n${commands.map(([name, about]) => `  ${bold(name.padEnd(width))}  ${about}`).join("\n")}`);
  }

  if (spec.positionals.length > 0) {
    const width = Math.max(...spec.positionals.map((positional) => positionalUsage(positional).length));
    const lines = spec.positionals.map((positional) => `  ${bold(positionalUsage(positional).padEnd(width))}  ${positional.help}`);
    sections.push(`${heading("Arguments:")}\n${lines.join("\n")}`);
  }

  const options = [...spec.options, HELP, ...(path.length === 1 ? [VERSION_OPTION] : [])];
  const flag = (option: OptionSpec): string =>
    `${option.short === undefined ? "    " : `-${option.short}, `}--${option.long}${option.value === undefined ? "" : ` <${option.value}>`}`;
  const hasLongHelp = options.some((option) => option.longHelp !== undefined);
  const optionHelp = (option: OptionSpec): string =>
    option === HELP && hasLongHelp && !long ? "Print help (see more with '--help')" : option.help;

  if (long && hasLongHelp) {
    const lines = options.map((option) => {
      const text = (option.longHelp ?? optionHelp(option)).split("\n").map((line) => (line === "" ? "" : `          ${line}`));
      return `  ${bold(flag(option))}\n${text.join("\n")}`;
    });
    sections.push(`${heading("Options:")}\n${lines.join("\n\n")}`);
  } else {
    const width = Math.max(...options.map((option) => flag(option).length));
    const lines = options.map((option) => `  ${bold(flag(option).padEnd(width))}  ${optionHelp(option)}`);
    sections.push(`${heading("Options:")}\n${lines.join("\n")}`);
  }

  return `${sections.join("\n\n")}\n`;
}
