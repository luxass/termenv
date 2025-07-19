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

import { getTerminalEnvironment } from "./env";

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

// https://github.com/chalk/ansi-regex/blob/827322a26097791c663a3688d5d938d197519a0f/index.js
const ST = "(?:\\u0007|\\u001B\\u005C|\\u009C)";
const ANSI_PATTERNS = [
  `[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?${ST})`,
  "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))",
];

const ANSI_PATTERN = new RegExp(
  // eslint-disable-next-line regexp/no-useless-non-capturing-group, regexp/no-trivially-nested-quantifier, regexp/no-useless-quantifier, regexp/prefer-w, regexp/no-useless-escape
  ANSI_PATTERNS.join("|"),
  "g",
);

/**
 * Strip Ansi Escape Codes from a string
 * @param {string} text - The text to strip
 * @returns {string} The stripped text without ansi escape codes
 */
export function strip(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

/**
 * Represents the size of a terminal window.
 */
export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowSizeOptions<TGlobal = typeof globalThis> {
  width?: number;
  height?: number;
  mockGlobal?: TGlobal;
}

/**
 * Gets the current terminal window size in columns and rows.
 *
 * This function retrieves the terminal window dimensions from the process stdout
 * or falls back to provided default values if the dimensions are not available.
 *
 * @template {typeof globalThis} TGlobal - The type of the global object to mock (defaults to typeof globalThis)
 * @param {WindowSizeOptions<TGlobal>} options - Configuration options for getting window size
 * @param {number} [options.width] - Fallback width in columns if process stdout columns is not available
 * @param {number} [options.height] - Fallback height in rows if process stdout rows is not available
 * @param {TGlobal} [options.mockGlobal] - Optional mock global object for testing purposes
 * @returns {WindowSize} An object containing the terminal width and height
 *
 * @example
 * ```ts
 * import { getWindowSize } from "termenv/utils";
 *
 * // Get current terminal size
 * const size = getWindowSize({});
 * console.log(`Terminal size: ${size.width}x${size.height}`);
 * ```
 *
 * @example
 * ```ts
 * import { getWindowSize } from "termenv/utils";
 *
 * // With fallback values
 * const size = getWindowSize({
 *   width: 80,
 *   height: 24
 * });
 * console.log(`Terminal size: ${size.width}x${size.height}`);
 * ```
 *
 * @example
 * ```ts
 * import { getWindowSize } from "termenv/utils";
 *
 * // With mock global for testing
 * const mockGlobal = {
 *   process: {
 *     stdout: {
 *       columns: 120,
 *       rows: 30
 *     }
 *   }
 * };
 *
 * const size = getWindowSize({ mockGlobal });
 * console.log(`Mocked terminal size: ${size.width}x${size.height}`);
 * ```
 *
 * @remarks
 * The function prioritizes process stdout dimensions over fallback values:
 * 1. First tries to get dimensions from `process.stdout.columns` and `process.stdout.rows`
 * 2. Falls back to provided `width` and `height` options
 * 3. Defaults to 0 if neither are available
 */
export function getWindowSize<TGlobal = typeof globalThis>(options?: WindowSizeOptions<TGlobal>): WindowSize {
  const mockGlobal = options?.mockGlobal || globalThis;

  // eslint-disable-next-line node/prefer-global/process
  const proc = (mockGlobal as any).process || {};

  return {
    width: proc.stdout?.columns || options?.width || 0,
    height: proc.stdout?.rows || options?.height || 0,
  };
}

/**
 * Determines if the current terminal environment supports Unicode characters.
 *
 * This function checks various environment variables and platform-specific conditions
 * to determine if Unicode characters can be safely displayed in the terminal.
 *
 * @template {typeof globalThis} TGlobal - The type of the global object to mock (defaults to typeof globalThis)
 * @param {TGlobal?} mockGlobal - Optional mock global object for testing purposes
 * @returns `true` if Unicode is supported, `false` otherwise
 *
 * @example
 * ```ts
 * import { isUnicodeSupported } from "termenv/utils";
 *
 * if (isUnicodeSupported()) {
 *   console.log("✅ Unicode is supported!");
 * } else {
 *   console.log("❌ Unicode is not supported");
 * }
 * ```
 *
 * @example
 * ```ts
 * import { isUnicodeSupported } from "termenv/utils";
 *
 * // With mock global for testing
 * const mockGlobal = {
 *   process: {
 *     platform: "darwin",
 *     env: { TERM: "xterm-256color" },
 *     stdout: { isTTY: true }
 *   }
 * };
 *
 * const supported = isUnicodeSupported(mockGlobal);
 * ```
 *
 * @remarks
 * Platform-specific behavior:
 * - **Windows**: Checks for CI environment, Windows Terminal, VS Code, or specific terminal types
 * - **macOS**: Generally supports Unicode
 * - **Other platforms**: Checks terminal type and locale settings
 *
 * The function returns `false` for non-TTY environments and "dumb" terminals.
 */
export function isUnicodeSupported<TGlobal = typeof globalThis>(mockGlobal?: TGlobal): boolean {
  const environment = getTerminalEnvironment(mockGlobal);

  if (environment.platform === "win32") {
    return Boolean(environment.env.CI)
      || Boolean(environment.env.WT_SESSION)
      || environment.env.TERM_PROGRAM === "vscode"
      || environment.env.TERM === "xterm-256color"
      || environment.env.TERM === "alacritty";
  }

  if (!environment.isTTY) {
    return false;
  }

  if (environment.env.TERM === "dumb") {
    return false;
  }

  if (environment.platform === "darwin") {
    return true;
  }

  if (environment.env.TERM && ["xterm", "xterm-256color", "xterm-color", "screen", "screen-256color", "tmux", "tmux-256color"].includes(environment.env.TERM)) {
    return true;
  }

  return Boolean(environment.env.LANG && environment.env.LANG.includes("UTF-8"));
}
