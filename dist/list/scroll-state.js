// Which row of the list is selected, and which rows are visible.
//
// The selection keeps a few rows of padding from the top and bottom edges
// while scrolling, like `scrolloff` in Vim.
export class ScrollState {
    #nRows;
    #maxNRowsToDisplay = 0;
    #selected;
    #offset;
    #scrollPadding = 0;
    #maxScrollPadding;
    constructor(nRows, selected, maxScrollPadding) {
        this.#nRows = nRows;
        this.#selected = selected;
        this.#offset = selected === undefined ? 0 : Math.max(0, selected - maxScrollPadding);
        this.#maxScrollPadding = maxScrollPadding;
    }
    /** The index of the first visible row. */
    get offset() {
        return this.#offset;
    }
    get selected() {
        return this.#selected;
    }
    get maxNRowsToDisplay() {
        return this.#maxNRowsToDisplay;
    }
    #updateOffset() {
        if (this.#selected === undefined)
            return;
        const minOffset = Math.max(0, this.#selected + this.#scrollPadding - Math.max(0, this.#maxNRowsToDisplay - 1));
        const maxOffset = Math.max(0, this.#selected - this.#scrollPadding);
        const globalMaxOffset = Math.max(0, this.#nRows - this.#maxNRowsToDisplay);
        this.#offset = Math.min(Math.max(this.#offset, minOffset), maxOffset, globalMaxOffset);
    }
    setSelected(selected) {
        this.#selected = selected;
        this.#updateOffset();
    }
    selectNext() {
        if (this.#selected !== undefined)
            this.setSelected(Math.min(this.#selected + 1, this.#nRows - 1));
    }
    selectPrevious() {
        if (this.#selected !== undefined)
            this.setSelected(Math.max(0, this.#selected - 1));
    }
    selectFirst() {
        if (this.#nRows > 0)
            this.setSelected(0);
    }
    selectLast() {
        if (this.#nRows > 0)
            this.setSelected(this.#nRows - 1);
    }
    setNRows(nRows) {
        this.#nRows = nRows;
        if (nRows === 0) {
            this.#selected = undefined;
            return;
        }
        this.setSelected(Math.min(this.#selected ?? 0, nRows - 1));
    }
    setMaxNRowsToDisplay(maxNRowsToDisplay) {
        this.#maxNRowsToDisplay = maxNRowsToDisplay;
        this.#scrollPadding = Math.min(Math.floor(maxNRowsToDisplay / 4), this.#maxScrollPadding);
        this.#updateOffset();
    }
}
