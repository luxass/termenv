/**
 * @module utils
 *
 * Utility functions for working with terminal escape codes.
 *
 * @example
 * ```ts
 * import { strip } from "termenv/utils";
 *
 * const text = "\u001b[31mHello, World!\u001b[0m";
 * console.log(strip(text));
 * // => "Hello, World!"
 * ```
 *
 * @example
 * ```ts
 * import {
 *   RESET,
 *   ERASE_SCREEN,
 *   ERASE_SCREEN_LEFT,
 *   ERASE_SCREEN_RIGHT,
 *   ERASE_LINE,
 *   ERASE_LINE_LEFT,
 *   ERASE_LINE_RIGHT
 * } from "termenv/utils";
 *
 * process.stdout.write(RESET);
 * process.stdout.write(ERASE_SCREEN);
 * process.stdout.write(ERASE_SCREEN_LEFT);
 * process.stdout.write(ERASE_SCREEN_RIGHT);
 * process.stdout.write(ERASE_LINE);
 * process.stdout.write(ERASE_LINE_LEFT);
 * process.stdout.write(ERASE_LINE_RIGHT);
 * ```
 */

import process from "node:process";
import tty from "node:tty";

/**
 * The ANSI escape code for resetting all attributes.
 */
export const RESET = "\x1B[2J\x1B[0;0H";

/**
 * The ANSI escape code for erasing the screen.
 */
export const ERASE_SCREEN = "\x1B[2J";

/**
 * The ANSI escape code for erasing the screen to the left of the cursor.
 */
export const ERASE_SCREEN_LEFT = "\x1B[1J";

/**
 * The ANSI escape code for erasing the screen to the right of the cursor.
 */
export const ERASE_SCREEN_RIGHT = "\x1B[J";

/**
 * The ANSI escape code for erasing the current line.
 */
export const ERASE_LINE = "\x1B[2K";

/**
 * The ANSI escape code for erasing the line to the left of the cursor.
 */
export const ERASE_LINE_LEFT = "\x1B[1K";

/**
 * The ANSI escape code for erasing the line to the right of the cursor.
 */
export const ERASE_LINE_RIGHT = "\x1B[K";

/**
 * Regex for matching ANSI escape codes.
 */
// eslint-disable-next-line no-control-regex
export const ANSI_REGEX = /[\u001B\u009B][[\]()#;?]*(?:(?:(?:;[-\w/#&.:=?%@~]+)+|[a-zA-Z\d]+(?:;[-\w/#&.:=?%@~]*)*)?\u0007|(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-ntqry=><~])/g;

/**
 * Strip Ansi Escape Codes from a string
 * @param {string} text - The text to strip
 * @returns {string} The stripped text without ansi escape codes
 */
export function strip(text: string): string {
  return text.replace(ANSI_REGEX, "");
}

/**
 * Represents the size of a terminal window.
 */
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

/**
 * Checks if the current environment supports Unicode.
 * @returns {boolean} A boolean value indicating whether Unicode is supported.
 */
export function isUnicodeSupported(): boolean {
  if (process.platform === "win32") {
    return Boolean(process.env.CI)
      || Boolean(process.env.WT_SESSION)
      || process.env.TERM_PROGRAM === "vscode"
      || process.env.TERM === "xterm-256color"
      || process.env.TERM === "alacritty";
  }

  if (!tty.isatty(1)) {
    return false;
  }

  if (process.env.TERM === "dumb") {
    return false;
  }

  if (process.platform === "darwin") {
    return true;
  }

  if (process.env.TERM && ["xterm", "xterm-256color", "xterm-color", "screen", "screen-256color", "tmux", "tmux-256color"].includes(process.env.TERM)) {
    return true;
  }

  return Boolean(process.env.LANG && process.env.LANG.includes("UTF-8"));
}
