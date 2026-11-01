// `tslings dev …`: commands for people who write exercises.

import type { Command } from "./cli.ts";
import { check } from "./dev/check.ts";
import { devNew } from "./dev/new.ts";
import { update } from "./dev/update.ts";

export type DevCommand = Extract<Command, { kind: "dev-new" | "dev-check" | "dev-update" }>;

export async function runDevCommand(command: DevCommand): Promise<void> {
  switch (command.kind) {
    case "dev-new":
      try {
        devNew(command.path, command.noGit);
      } catch (error) {
        throw new Error(
          "Initialization failed.\nAfter resolving the issue, delete the directory (if it was created) and try again",
          { cause: error },
        );
      }
      return;
    case "dev-check":
      await check(command.requireSolutions);
      return;
    case "dev-update":
      update();
      return;
  }
}
