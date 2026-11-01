// The list of all exercises: what's selected, filtered and searched, and how
// it's drawn. Drawing returns a string so the logic can be tested without a
// terminal.
import { stripVTControlCharacters } from "node:util";
import { exerciseLink } from "../exercise.js";
import { ansi, LineWriter, progressBar } from "../term.js";
import { ScrollState } from "./scroll-state.js";
const COL_SPACING = 2;
const HOTKEY = ["yellow", "bold"];
export class ListState {
    /** Footer message, shown instead of the key help when not empty. */
    message = "";
    #searchQuery = "";
    /** The exercise selected last, so a search that matches nothing doesn't lose it. */
    #lastSelected;
    #appState;
    #scrollState;
    #nameColWidth;
    #pathColWidth;
    #color;
    #filter = "none";
    #termWidth = 0;
    #termHeight = 0;
    #showFooter = true;
    constructor(appState, termWidth, termHeight, color) {
        this.#appState = appState;
        this.#color = color;
        this.#nameColWidth = Math.max("Name".length, ...appState.exercises.map((exercise) => exercise.name.length));
        this.#pathColWidth = Math.max("Path".length, ...appState.exercises.map((exercise) => exercise.path.length));
        this.#scrollState = new ScrollState(appState.exercises.length, appState.currentExerciseInd, 5);
        this.setTermSize(termWidth, termHeight);
    }
    get filter() {
        return this.#filter;
    }
    /** While searching, only the exercises whose name contains it are shown. */
    get searchQuery() {
        return this.#searchQuery;
    }
    /** The selected row, in the filtered list. */
    get selected() {
        return this.#scrollState.selected;
    }
    setTermSize(width, height) {
        this.#termWidth = width;
        this.#termHeight = height;
        if (height === 0)
            return;
        const headerHeight = 1;
        // The progress bar and two lines of footer message.
        const footerHeight = 3;
        this.#showFooter = height > headerHeight + footerHeight;
        this.#scrollState.setMaxNRowsToDisplay(Math.max(0, height - headerHeight - (this.#showFooter ? footerHeight : 0)));
    }
    /** The exercises shown with the current filter and search, with their index in the full list. */
    filteredExercises() {
        return this.#appState.exercises
            .map((exercise, index) => ({ index, exercise }))
            .filter(({ exercise }) => this.#filter === "none" || exercise.done === (this.#filter === "done"))
            .filter(({ exercise }) => exercise.name.includes(this.#searchQuery));
    }
    setFilter(filter) {
        this.#filter = filter;
        this.#updateRows();
    }
    #updateRows() {
        this.#scrollState.setNRows(this.filteredExercises().length);
    }
    selectNext() {
        this.#scrollState.selectNext();
    }
    selectPrevious() {
        this.#scrollState.selectPrevious();
    }
    selectFirst() {
        this.#scrollState.selectFirst();
    }
    selectLast() {
        this.#scrollState.selectLast();
    }
    #selectedExerciseInd() {
        const selected = this.#scrollState.selected;
        return selected === undefined ? undefined : this.filteredExercises()[selected]?.index;
    }
    resetSelected() {
        const index = this.#selectedExerciseInd();
        if (index === undefined) {
            this.message += "Nothing selected to reset!";
            return;
        }
        const name = this.#appState.resetExerciseByInd(index);
        this.message += `The exercise \`${name}\` has been reset`;
        this.#updateRows();
    }
    /** Select the row of an exercise again after the rows changed, if it's still shown. */
    #reselect(exerciseInd) {
        const row = this.filteredExercises().findIndex(({ index }) => index === exerciseInd);
        if (row !== -1)
            this.#scrollState.setSelected(row);
    }
    /** Show only the exercises matching `query`, as the learner types it, and select the first one. */
    setSearchQuery(query) {
        this.#rememberSelection();
        this.#searchQuery = query;
        this.message += `search:${query}|`;
        this.#updateRows();
        if (query === "")
            this.#reselect(this.#lastSelected);
        else if (this.filteredExercises().length === 0)
            this.message += " (not found)";
        else
            this.#scrollState.setSelected(0);
    }
    /** Show all exercises again, keeping the selected one. */
    endSearch() {
        this.#rememberSelection();
        this.#searchQuery = "";
        this.#updateRows();
        this.#reselect(this.#lastSelected);
    }
    #rememberSelection() {
        this.#lastSelected = this.#selectedExerciseInd() ?? this.#lastSelected;
    }
    /** Make the selected exercise the current one. Returns `false` when nothing is selected. */
    selectedToCurrentExercise() {
        const index = this.#selectedExerciseInd();
        if (index === undefined) {
            this.message += "Nothing selected to continue at!";
            return false;
        }
        this.#appState.setCurrentExerciseInd(index);
        return true;
    }
    /** The whole screen, ready to be written to the terminal. */
    draw() {
        if (this.#termHeight === 0)
            return "";
        const width = this.#termWidth;
        const lines = [];
        const header = new LineWriter(width, this.#color)
            .text("  Current  State    Name")
            .text(" ".repeat(this.#nameColWidth - "Name".length + COL_SPACING))
            .text("Path");
        lines.push(header);
        const rows = this.filteredExercises()
            .slice(this.#scrollState.offset, this.#scrollState.offset + this.#scrollState.maxNRowsToDisplay)
            .map(({ index, exercise }, row) => this.#drawRow(index, exercise, this.#scrollState.offset + row));
        lines.push(...rows);
        for (let row = rows.length; row < this.#scrollState.maxNRowsToDisplay; row++)
            lines.push(new LineWriter(width, this.#color));
        if (this.#showFooter) {
            const bar = progressBar(this.#appState.nDone, this.#appState.exercises.length, width, this.#color);
            lines.push(new LineWriter(width, this.#color).raw(bar).addWidth(stripVTControlCharacters(bar).length));
            lines.push(...this.#drawFooterMessage());
        }
        // Clearing the rest of a line that fills the whole width would erase its last character.
        const frame = lines
            .map((line) => line.toString() + ansi.reset + (line.length < width ? ansi.clearToEndOfLine : ""))
            .join(ansi.nextLine);
        return ansi.beginSynchronizedUpdate + ansi.moveTo(0, 0) + frame + ansi.endSynchronizedUpdate;
    }
    #drawRow(exerciseInd, exercise, row) {
        const writer = new LineWriter(this.#termWidth, this.#color);
        if (this.#scrollState.selected === row) {
            writer.text("❯", ["blue", "bold"]).text(" ").raw(ansi.reverse + ansi.bold);
        }
        else {
            writer.text("  ");
        }
        writer.text(exerciseInd === this.#appState.currentExerciseInd ? ">>>>>>>  " : "         ", "red");
        writer.text(exercise.done ? "DONE   " : "PENDING", exercise.done ? "green" : "yellow");
        writer.text("  ");
        const match = this.#searchQuery === "" ? -1 : exercise.name.indexOf(this.#searchQuery);
        if (match === -1) {
            writer.text(exercise.name);
        }
        else {
            writer
                .text(exercise.name.slice(0, match))
                .text(this.#searchQuery, "magenta")
                .text(exercise.name.slice(match + this.#searchQuery.length));
        }
        writer.text(" ".repeat(this.#nameColWidth - exercise.name.length + COL_SPACING));
        // The path is short ASCII, so it either fits whole or gets cut as plain text.
        const room = this.#termWidth - writer.length;
        if (room >= exercise.path.length) {
            writer.raw(exerciseLink(exercise, this.#appState.emitFileLinks)).addWidth(exercise.path.length);
        }
        else {
            writer.text(exercise.path, "blue");
        }
        writer.text(" ".repeat(this.#pathColWidth - exercise.path.length));
        return writer;
    }
    #drawFooterMessage() {
        const width = this.#termWidth;
        if (this.message !== "") {
            return [new LineWriter(width, this.#color).text(this.message, "magenta"), new LineWriter(width, this.#color)];
        }
        const first = new LineWriter(width, this.#color);
        let second = first;
        if (this.#scrollState.selected !== undefined) {
            first
                .text("↓/")
                .text("j", HOTKEY)
                .text(" ↑/")
                .text("k", HOTKEY)
                .text(" home/")
                .text("g", HOTKEY)
                .text(" end/")
                .text("G", HOTKEY)
                .text(" │ ↵/")
                .text("c", HOTKEY)
                .text("ontinue at │ ")
                .text("r", HOTKEY)
                .text("eset exercise");
            second = new LineWriter(width, this.#color);
            second.text("s", HOTKEY).text("earch │ filter ");
        }
        else {
            // Nothing selected (and nothing shown): only filters and quit.
            first.text("filter ");
        }
        switch (this.#filter) {
            case "done":
                second.text("d", [...HOTKEY, "underline"]).text("one", ["magenta", "underline"]).text("/").text("p", HOTKEY).text("ending");
                break;
            case "pending":
                second.text("d", HOTKEY).text("one/").text("p", [...HOTKEY, "underline"]).text("ending", ["magenta", "underline"]);
                break;
            case "none":
                second.text("d", HOTKEY).text("one/").text("p", HOTKEY).text("ending");
                break;
        }
        second.text(" │ ").text("q", HOTKEY).text("uit list");
        return [first, first === second ? new LineWriter(width, this.#color) : second];
    }
}
