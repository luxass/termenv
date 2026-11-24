/**
 * @module sequences
 *
 * Builders for terminal control sequences: cursor movement, line editing, the alternate screen,
 * mouse reporting, and bracketed paste. Ported from https://github.com/muesli/termenv.
 *
 * Every export is a string or a function that returns a string. Nothing is written to the terminal,
 * so you decide where the output goes.
 *
 * Re-exported from `termenv/utils`.
 */

const CSI = "\u001B[";

/**
 * Checks that a sequence parameter is a non-negative integer, so a bad value can't produce a malformed sequence.
 *
 * @param {string} functionName - The public function name, used in the error message
 * @param {string} parameterName - The parameter name, used in the error message
 * @param {number} value - The value to check
 * @throws {RangeError} If `value` is negative, not an integer, `NaN`, or infinite
 */
function assertCount(functionName: string, parameterName: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(
      `${functionName}: ${parameterName} must be a non-negative integer, got ${String(value)}`,
    );
  }
}

/**
 * Builds a sequence that takes one count, such as `CSI 3 A`.
 *
 * A count of `0` returns an empty string. Terminals treat `CSI 0 A` the same as `CSI 1 A`,
 * so passing `0` through would move the cursor when the caller asked for no movement.
 *
 * @param {string} functionName - The public function name, used in the error message
 * @param {number} count - How many times to repeat the action
 * @param {string} finalByte - The final byte that selects the action, such as `A`
 * @returns {string} The sequence, or an empty string for a count of `0`
 * @throws {RangeError} If `count` isn't a non-negative integer
 */
function countSequence(functionName: string, count: number, finalByte: string): string {
  assertCount(functionName, "count", count);
  if (count === 0) return "";
  return `${CSI}${count}${finalByte}`;
}

/**
 * Moves the cursor up by `count` rows (`CSI n A`).
 *
 * The cursor stops at the top of the screen.
 *
 * @param {number} [count=1] - How many rows to move up
 * @returns {string} The sequence, or an empty string for a count of `0`
 * @throws {RangeError} If `count` isn't a non-negative integer
 *
 * @example
 * ```ts
 * import { cursorUp } from "termenv/utils";
 *
 * process.stdout.write(cursorUp(2));
 * ```
 */
export function cursorUp(count = 1): string {
  return countSequence("cursorUp", count, "A");
}

/**
 * Moves the cursor down by `count` rows (`CSI n B`).
 *
 * The cursor stops at the bottom of the screen. It doesn't scroll.
 *
 * @param {number} [count=1] - How many rows to move down
 * @returns {string} The sequence, or an empty string for a count of `0`
 * @throws {RangeError} If `count` isn't a non-negative integer
 *
 * @example
 * ```ts
 * import { cursorDown } from "termenv/utils";
 *
 * process.stdout.write(cursorDown(2));
 * ```
 */
export function cursorDown(count = 1): string {
  return countSequence("cursorDown", count, "B");
}

/**
 * Moves the cursor right by `count` columns (`CSI n C`).
 *
 * The cursor stops at the right edge of the screen.
 *
 * @param {number} [count=1] - How many columns to move right
 * @returns {string} The sequence, or an empty string for a count of `0`
 * @throws {RangeError} If `count` isn't a non-negative integer
 *
 * @example
 * ```ts
 * import { cursorForward } from "termenv/utils";
 *
 * process.stdout.write(cursorForward(4));
 * ```
 */
export function cursorForward(count = 1): string {
  return countSequence("cursorForward", count, "C");
}

/**
 * Moves the cursor left by `count` columns (`CSI n D`).
 *
 * The cursor stops at the left edge of the screen.
 *
 * @param {number} [count=1] - How many columns to move left
 * @returns {string} The sequence, or an empty string for a count of `0`
 * @throws {RangeError} If `count` isn't a non-negative integer
 *
 * @example
 * ```ts
 * import { cursorBack } from "termenv/utils";
 *
 * process.stdout.write(cursorBack(4));
 * ```
 */
export function cursorBack(count = 1): string {
  return countSequence("cursorBack", count, "D");
}

/**
 * Moves the cursor to the start of the line `count` rows down (`CSI n E`).
 *
 * @param {number} [count=1] - How many rows to move down
 * @returns {string} The sequence, or an empty string for a count of `0`
 * @throws {RangeError} If `count` isn't a non-negative integer
 *
 * @example
 * ```ts
 * import { cursorNextLine } from "termenv/utils";
 *
 * process.stdout.write(cursorNextLine());
 * ```
 */
export function cursorNextLine(count = 1): string {
  return countSequence("cursorNextLine", count, "E");
}

/**
 * Moves the cursor to the start of the line `count` rows up (`CSI n F`).
 *
 * @param {number} [count=1] - How many rows to move up
 * @returns {string} The sequence, or an empty string for a count of `0`
 * @throws {RangeError} If `count` isn't a non-negative integer
 *
 * @example
 * ```ts
 * import { cursorPrevLine } from "termenv/utils";
 *
 * process.stdout.write(cursorPrevLine(3));
 * ```
 */
export function cursorPrevLine(count = 1): string {
  return countSequence("cursorPrevLine", count, "F");
}

/**
 * Moves the cursor to a position (`CSI row ; column H`).
 *
 * Rows and columns start at 1. The top-left corner is `moveCursor(1, 1)`.
 *
 * @param {number} row - The row to move to, starting at 1
 * @param {number} column - The column to move to, starting at 1
 * @returns {string} The sequence
 * @throws {RangeError} If `row` or `column` isn't a non-negative integer
 *
 * @example
 * ```ts
 * import { moveCursor } from "termenv/utils";
 *
 * // Write a status in the top-left corner.
 * process.stdout.write(moveCursor(1, 1) + "Ready");
 * ```
 */
export function moveCursor(row: number, column: number): string {
  assertCount("moveCursor", "row", row);
  assertCount("moveCursor", "column", column);
  return `${CSI}${row};${column}H`;
}

/**
 * Saves the cursor position (`CSI s`).
 *
 * Restore it with {@link RESTORE_CURSOR_POSITION}.
 */
export const SAVE_CURSOR_POSITION = `${CSI}s`;

/**
 * Restores the cursor position saved with {@link SAVE_CURSOR_POSITION} (`CSI u`).
 */
export const RESTORE_CURSOR_POSITION = `${CSI}u`;

/**
 * Hides the cursor (`CSI ? 25 l`).
 *
 * Show it again with {@link SHOW_CURSOR} before your program exits.
 */
export const HIDE_CURSOR = `${CSI}?25l`;

/**
 * Shows the cursor hidden with {@link HIDE_CURSOR} (`CSI ? 25 h`).
 */
export const SHOW_CURSOR = `${CSI}?25h`;

/**
 * Clears the current line and the `count` lines above it, and leaves the cursor on the top cleared line.
 *
 * Use it to redraw output that took several lines, such as a progress display.
 *
 * @param {number} count - How many lines above the current line to clear. `0` clears only the current line
 * @returns {string} The sequence
 * @throws {RangeError} If `count` isn't a non-negative integer
 *
 * @example
 * ```ts
 * import { clearLines } from "termenv/utils";
 *
 * // Replace a 3-line progress display.
 * process.stdout.write(clearLines(2) + renderProgress());
 * ```
 */
export function clearLines(count: number): string {
  assertCount("clearLines", "count", count);
  const clearLine = `${CSI}2K`;
  return clearLine + `${CSI}1A${clearLine}`.repeat(count);
}

/**
 * Inserts `count` blank lines at the cursor and moves the lines below it down (`CSI n L`).
 *
 * Lines pushed past the bottom of the scrolling region are lost.
 *
 * @param {number} count - How many blank lines to insert
 * @returns {string} The sequence, or an empty string for a count of `0`
 * @throws {RangeError} If `count` isn't a non-negative integer
 *
 * @example
 * ```ts
 * import { insertLines } from "termenv/utils";
 *
 * process.stdout.write(insertLines(1));
 * ```
 */
export function insertLines(count: number): string {
  return countSequence("insertLines", count, "L");
}

/**
 * Deletes `count` lines at the cursor and moves the lines below it up (`CSI n M`).
 *
 * Blank lines fill the bottom of the scrolling region.
 *
 * @param {number} count - How many lines to delete
 * @returns {string} The sequence, or an empty string for a count of `0`
 * @throws {RangeError} If `count` isn't a non-negative integer
 *
 * @example
 * ```ts
 * import { deleteLines } from "termenv/utils";
 *
 * process.stdout.write(deleteLines(1));
 * ```
 */
export function deleteLines(count: number): string {
  return countSequence("deleteLines", count, "M");
}

/**
 * Limits scrolling to the rows from `top` to `bottom`, inclusive (`CSI top ; bottom r`).
 *
 * Rows start at 1. Use it to keep a header or a status line in place while the rest of the screen scrolls.
 *
 * @param {number} top - The first row of the scrolling region, starting at 1
 * @param {number} bottom - The last row of the scrolling region, starting at 1
 * @returns {string} The sequence
 * @throws {RangeError} If `top` or `bottom` isn't a non-negative integer
 *
 * @example
 * ```ts
 * import { changeScrollingRegion, getWindowSize } from "termenv/utils";
 *
 * // Keep the first row as a fixed header.
 * const { height } = getWindowSize();
 * process.stdout.write(changeScrollingRegion(2, height));
 * ```
 */
export function changeScrollingRegion(top: number, bottom: number): string {
  assertCount("changeScrollingRegion", "top", top);
  assertCount("changeScrollingRegion", "bottom", bottom);
  return `${CSI}${top};${bottom}r`;
}

/**
 * Switches to the alternate screen buffer (`CSI ? 1049 h`).
 *
 * Full-screen programs such as editors use it, so the shell output comes back when they exit.
 * Leave it with {@link EXIT_ALT_SCREEN}.
 */
export const ALT_SCREEN = `${CSI}?1049h`;

/**
 * Leaves the alternate screen buffer and shows the previous screen content (`CSI ? 1049 l`).
 */
export const EXIT_ALT_SCREEN = `${CSI}?1049l`;

/**
 * Saves the screen content (`CSI ? 47 h`).
 *
 * Prefer {@link ALT_SCREEN}, which more terminals support. Restore it with {@link RESTORE_SCREEN}.
 */
export const SAVE_SCREEN = `${CSI}?47h`;

/**
 * Restores the screen content saved with {@link SAVE_SCREEN} (`CSI ? 47 l`).
 */
export const RESTORE_SCREEN = `${CSI}?47l`;

/**
 * Reports mouse button presses only (X10 mode, `CSI ? 9 h`).
 *
 * Stop it with {@link DISABLE_MOUSE_PRESS}.
 */
export const ENABLE_MOUSE_PRESS = `${CSI}?9h`;

/**
 * Stops the reports started with {@link ENABLE_MOUSE_PRESS} (`CSI ? 9 l`).
 */
export const DISABLE_MOUSE_PRESS = `${CSI}?9l`;

/**
 * Reports mouse presses, releases, and the wheel (`CSI ? 1000 h`).
 *
 * Stop it with {@link DISABLE_MOUSE}.
 */
export const ENABLE_MOUSE = `${CSI}?1000h`;

/**
 * Stops the reports started with {@link ENABLE_MOUSE} (`CSI ? 1000 l`).
 */
export const DISABLE_MOUSE = `${CSI}?1000l`;

/**
 * Enables highlight mouse tracking (`CSI ? 1001 h`).
 *
 * Stop it with {@link DISABLE_MOUSE_HILITE}.
 */
export const ENABLE_MOUSE_HILITE = `${CSI}?1001h`;

/**
 * Stops the reports started with {@link ENABLE_MOUSE_HILITE} (`CSI ? 1001 l`).
 */
export const DISABLE_MOUSE_HILITE = `${CSI}?1001l`;

/**
 * Reports presses, releases, the wheel, and motion while a button is held (`CSI ? 1002 h`).
 *
 * Use it for dragging. Stop it with {@link DISABLE_MOUSE_CELL_MOTION}.
 */
export const ENABLE_MOUSE_CELL_MOTION = `${CSI}?1002h`;

/**
 * Stops the reports started with {@link ENABLE_MOUSE_CELL_MOTION} (`CSI ? 1002 l`).
 */
export const DISABLE_MOUSE_CELL_MOTION = `${CSI}?1002l`;

/**
 * Reports presses, releases, the wheel, and all motion, also without a button held (`CSI ? 1003 h`).
 *
 * Use it for hover effects. Stop it with {@link DISABLE_MOUSE_ALL_MOTION}.
 */
export const ENABLE_MOUSE_ALL_MOTION = `${CSI}?1003h`;

/**
 * Stops the reports started with {@link ENABLE_MOUSE_ALL_MOTION} (`CSI ? 1003 l`).
 */
export const DISABLE_MOUSE_ALL_MOTION = `${CSI}?1003l`;

/**
 * Reports mouse events in SGR format, which supports coordinates beyond column 223 (`CSI ? 1006 h`).
 *
 * Combine it with one of the tracking modes above. Stop it with {@link DISABLE_MOUSE_EXTENDED_MODE}.
 *
 * @example
 * ```ts
 * import { ENABLE_MOUSE_CELL_MOTION, ENABLE_MOUSE_EXTENDED_MODE } from "termenv/utils";
 *
 * process.stdout.write(ENABLE_MOUSE_CELL_MOTION + ENABLE_MOUSE_EXTENDED_MODE);
 * ```
 */
export const ENABLE_MOUSE_EXTENDED_MODE = `${CSI}?1006h`;

/**
 * Stops the SGR format started with {@link ENABLE_MOUSE_EXTENDED_MODE} (`CSI ? 1006 l`).
 */
export const DISABLE_MOUSE_EXTENDED_MODE = `${CSI}?1006l`;

/**
 * Reports mouse events with pixel coordinates in SGR format (`CSI ? 1016 h`).
 *
 * Stop it with {@link DISABLE_MOUSE_PIXELS_MODE}.
 */
export const ENABLE_MOUSE_PIXELS_MODE = `${CSI}?1016h`;

/**
 * Stops the reports started with {@link ENABLE_MOUSE_PIXELS_MODE} (`CSI ? 1016 l`).
 */
export const DISABLE_MOUSE_PIXELS_MODE = `${CSI}?1016l`;

/**
 * Asks the terminal to wrap pasted text in {@link BRACKETED_PASTE_START} and {@link BRACKETED_PASTE_END}
 * (`CSI ? 2004 h`).
 *
 * A program can then tell pasted text from typed text, for example to avoid running pasted commands.
 * Stop it with {@link DISABLE_BRACKETED_PASTE}.
 */
export const ENABLE_BRACKETED_PASTE = `${CSI}?2004h`;

/**
 * Stops the wrapping started with {@link ENABLE_BRACKETED_PASTE} (`CSI ? 2004 l`).
 */
export const DISABLE_BRACKETED_PASTE = `${CSI}?2004l`;

/**
 * The marker the terminal sends on input before pasted text (`CSI 200 ~`).
 *
 * Only sent after {@link ENABLE_BRACKETED_PASTE}.
 */
export const BRACKETED_PASTE_START = `${CSI}200~`;

/**
 * The marker the terminal sends on input after pasted text (`CSI 201 ~`).
 *
 * Only sent after {@link ENABLE_BRACKETED_PASTE}.
 */
export const BRACKETED_PASTE_END = `${CSI}201~`;
