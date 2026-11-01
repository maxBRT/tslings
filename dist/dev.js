// `tslings dev …`: commands for people who write exercises.
import { check } from "./dev/check.js";
import { devNew } from "./dev/new.js";
import { update } from "./dev/update.js";
export async function runDevCommand(command) {
    switch (command.kind) {
        case "dev-new":
            try {
                devNew(command.path, command.noGit);
            }
            catch (error) {
                throw new Error("Initialization failed.\nAfter resolving the issue, delete the directory (if it was created) and try again", { cause: error });
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
