// How errors are shown to the learner.

import { paint } from "./term.ts";

/** Like Rust's anyhow: the error, then the chain of causes. */
export function formatError(error: unknown, color: boolean): string {
  const messages: string[] = [];
  for (let current: unknown = error; current !== undefined && messages.length < 16; ) {
    if (current instanceof Error) {
      messages.push(current.message);
      current = current.cause;
    } else {
      messages.push(String(current));
      current = undefined;
    }
  }

  const [first = "", ...causes] = messages;
  let out = `${paint(["bold", "red"], "Error:", color)} ${first}\n`;
  if (causes.length > 0) {
    out += "\nCaused by:\n";
    const indent = (text: string, prefix: string): string => {
      const [head = "", ...tail] = text.split("\n");
      const pad = " ".repeat(prefix.length);
      return [prefix + head, ...tail.map((line) => (line === "" ? "" : pad + line))].join("\n");
    };
    out += causes
      .map((cause, index) => indent(cause, causes.length === 1 ? "    " : `    ${index}: `))
      .join("\n");
    out += "\n";
  }
  return out;
}
