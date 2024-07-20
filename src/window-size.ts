/**
 * @module window-size
 *
 * Detect the size of the terminal window.
 *
 * @example
 * ```ts
 * import { getWindowSize } from "termenv/window-size";
 *
 * const size = getWindowSize();
 * console.log(size);
 * // => { width: 80, height: 24 }
 * ```
 */

import process from "node:process";

export interface WindowSize {
  width: number;
  height: number;
}

/**
 * Retrieves the size of the current terminal window.
 * If the size cannot be determined, a fallback size is used.
 *
 * @param {WindowSize} fallback - The fallback size to use if the window size cannot be determined.
 * @returns {WindowSize} The size of the terminal window.
 */
export function getWindowSize(fallback: WindowSize = {
  height: 0,
  width: 0,
}): WindowSize {
  return {
    width: process.stdout.columns || fallback.width || 0,
    height: process.stdout.rows || fallback.height || 0,
  };
}
