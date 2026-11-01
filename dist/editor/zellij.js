// Open exercises in Zellij panes: https://zellij.dev
import { runCommand } from "../cmd.js";
import { isRecord } from "../json.js";
/** Parse the output of `zellij action edit`: `terminal_12\n`. */
export function parsePaneId(output) {
    const match = /^terminal_(\d+)\s*$/.exec(output);
    if (match?.[1] === undefined)
        return undefined;
    return { name: `terminal_${match[1]}`, id: Number(match[1]) };
}
/** Open a file in a new editor pane and return the pane's ID. */
export async function editInPane(path) {
    const { stdout } = await runCommand("zellij", ["action", "edit", path]);
    const pane = parsePaneId(stdout);
    if (pane === undefined)
        throw new Error("Failed to parse the ID of the new Zellij pane");
    return pane;
}
/** Whether the pane is still open (the learner may have closed it). */
export async function paneOpen(id) {
    const { stdout } = await runCommand("zellij", ["action", "list-panes", "-j"]);
    let panes;
    try {
        panes = JSON.parse(stdout);
    }
    catch (error) {
        throw new Error("Failed to parse the output of `zellij action list-panes -j`", { cause: error });
    }
    return Array.isArray(panes) && panes.some((pane) => isRecord(pane) && pane.id === id);
}
export async function closePane(name) {
    await runCommand("zellij", ["action", "close-pane", "-p", name]);
}
