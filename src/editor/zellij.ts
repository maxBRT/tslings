// Open exercises in Zellij panes: https://zellij.dev

import { runCommand } from "../cmd.ts";
import { isRecord } from "../json.ts";

export interface PaneId {
  /** `terminal_12`, as Zellij prints and accepts it. */
  readonly name: string;
  readonly id: number;
}

/** Parse the output of `zellij action edit`: `terminal_12\n`. */
export function parsePaneId(output: string): PaneId | undefined {
  const match = /^terminal_(\d+)\s*$/.exec(output);
  if (match?.[1] === undefined) return undefined;
  return { name: `terminal_${match[1]}`, id: Number(match[1]) };
}

/** Open a file in a new editor pane and return the pane's ID. */
export async function editInPane(path: string): Promise<PaneId> {
  const { stdout } = await runCommand("zellij", ["action", "edit", path]);
  const pane = parsePaneId(stdout);
  if (pane === undefined) throw new Error("Failed to parse the ID of the new Zellij pane");
  return pane;
}

/** Whether the pane is still open (the learner may have closed it). */
export async function paneOpen(id: number): Promise<boolean> {
  const { stdout } = await runCommand("zellij", ["action", "list-panes", "-j"]);
  let panes: unknown;
  try {
    panes = JSON.parse(stdout);
  } catch (error) {
    throw new Error("Failed to parse the output of `zellij action list-panes -j`", { cause: error });
  }
  return Array.isArray(panes) && panes.some((pane: unknown) => isRecord(pane) && pane.id === id);
}

export async function closePane(name: string): Promise<void> {
  await runCommand("zellij", ["action", "close-pane", "-p", name]);
}
