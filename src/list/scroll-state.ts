// Which row of the list is selected, and which rows are visible.
//
// The selection keeps a few rows of padding from the top and bottom edges
// while scrolling, like `scrolloff` in Vim.

export class ScrollState {
  #nRows: number;
  #maxNRowsToDisplay = 0;
  #selected: number | undefined;
  #offset: number;
  #scrollPadding = 0;
  readonly #maxScrollPadding: number;

  constructor(nRows: number, selected: number | undefined, maxScrollPadding: number) {
    this.#nRows = nRows;
    this.#selected = selected;
    this.#offset = selected === undefined ? 0 : Math.max(0, selected - maxScrollPadding);
    this.#maxScrollPadding = maxScrollPadding;
  }

  /** The index of the first visible row. */
  get offset(): number {
    return this.#offset;
  }

  get selected(): number | undefined {
    return this.#selected;
  }

  get maxNRowsToDisplay(): number {
    return this.#maxNRowsToDisplay;
  }

  #updateOffset(): void {
    if (this.#selected === undefined) return;
    const minOffset = Math.max(0, this.#selected + this.#scrollPadding - Math.max(0, this.#maxNRowsToDisplay - 1));
    const maxOffset = Math.max(0, this.#selected - this.#scrollPadding);
    const globalMaxOffset = Math.max(0, this.#nRows - this.#maxNRowsToDisplay);
    this.#offset = Math.min(Math.max(this.#offset, minOffset), maxOffset, globalMaxOffset);
  }

  setSelected(selected: number): void {
    this.#selected = selected;
    this.#updateOffset();
  }

  selectNext(): void {
    if (this.#selected !== undefined) this.setSelected(Math.min(this.#selected + 1, this.#nRows - 1));
  }

  selectPrevious(): void {
    if (this.#selected !== undefined) this.setSelected(Math.max(0, this.#selected - 1));
  }

  selectFirst(): void {
    if (this.#nRows > 0) this.setSelected(0);
  }

  selectLast(): void {
    if (this.#nRows > 0) this.setSelected(this.#nRows - 1);
  }

  setNRows(nRows: number): void {
    this.#nRows = nRows;
    if (nRows === 0) {
      this.#selected = undefined;
      return;
    }
    this.setSelected(Math.min(this.#selected ?? 0, nRows - 1));
  }

  setMaxNRowsToDisplay(maxNRowsToDisplay: number): void {
    this.#maxNRowsToDisplay = maxNRowsToDisplay;
    this.#scrollPadding = Math.min(Math.floor(maxNRowsToDisplay / 4), this.#maxScrollPadding);
    this.#updateOffset();
  }
}
