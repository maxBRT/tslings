// The list mode (`l` in watch mode): a full-screen table of all exercises.
import { ListState } from "./list/state.js";
import { enterAlternateScreen, leaveAlternateScreen, restoreTerminal, stdoutColor, write } from "./term.js";
function handleKey(state, key, searching) {
    // Any key hides the previous message.
    const hadMessage = state.message !== "";
    state.message = "";
    if (searching.active) {
        switch (key.name) {
            case "escape":
            case "enter":
                searching.active = false;
                state.endSearch();
                break;
            case "char":
                state.setSearchQuery(state.searchQuery + key.char);
                break;
            case "backspace":
                state.setSearchQuery(state.searchQuery.slice(0, -1));
                break;
            // Moving between the matches.
            case "down":
            case "scroll-down":
                state.message = `search:${state.searchQuery}|`;
                state.selectNext();
                break;
            case "up":
            case "scroll-up":
                state.message = `search:${state.searchQuery}|`;
                state.selectPrevious();
                break;
            default:
                return "ignore";
        }
        return "redraw";
    }
    if (key.name === "char") {
        switch (key.char) {
            case "q":
                return "exit";
            case "j":
                state.selectNext();
                return "redraw";
            case "k":
                state.selectPrevious();
                return "redraw";
            case "g":
                state.selectFirst();
                return "redraw";
            case "G":
                state.selectLast();
                return "redraw";
            case "d":
                toggleFilter(state, "done");
                return "redraw";
            case "p":
                toggleFilter(state, "pending");
                return "redraw";
            case "r":
                state.resetSelected();
                return "redraw";
            case "c":
                return state.selectedToCurrentExercise() ? "exit" : "redraw";
            case "s":
            case "/":
                searching.active = true;
                state.setSearchQuery("");
                return "redraw";
            default:
                return "ignore";
        }
    }
    switch (key.name) {
        case "down":
        case "scroll-down":
            state.selectNext();
            return "redraw";
        case "up":
        case "scroll-up":
            state.selectPrevious();
            return "redraw";
        case "home":
            state.selectFirst();
            return "redraw";
        case "end":
            state.selectLast();
            return "redraw";
        case "enter":
            return state.selectedToCurrentExercise() ? "exit" : "redraw";
        case "escape":
            // Escape first dismisses the message, then leaves the list.
            return hadMessage ? "redraw" : "exit";
        default:
            return "ignore";
    }
}
function toggleFilter(state, filter) {
    const label = filter.toUpperCase();
    if (state.filter === filter) {
        state.setFilter("none");
        state.message += `Disabled filter ${label}`;
    }
    else {
        state.setFilter(filter);
        state.message += `Enabled filter ${label} │ Press ${filter.charAt(0)} again to disable the filter`;
    }
}
/** Show the list until the learner leaves it or picks an exercise to continue at. */
export async function list(appState, input) {
    enterAlternateScreen();
    const size = () => [process.stdout.columns ?? 80, process.stdout.rows ?? 24];
    const state = new ListState(appState, ...size(), stdoutColor);
    const searching = { active: false };
    const onResize = () => {
        state.setTermSize(...size());
        write(state.draw());
    };
    process.stdout.on("resize", onResize);
    try {
        write(state.draw());
        await new Promise((resolve, reject) => {
            input.setHandler((key) => {
                if (key.name === "ctrl-c") {
                    restoreTerminal();
                    process.exit(130);
                }
                try {
                    const outcome = handleKey(state, key, searching);
                    if (outcome === "exit")
                        resolve();
                    else if (outcome === "redraw")
                        write(state.draw());
                }
                catch (error) {
                    reject(error);
                }
            });
        });
    }
    finally {
        process.stdout.off("resize", onResize);
        input.setHandler(() => { });
        leaveAlternateScreen();
    }
}
