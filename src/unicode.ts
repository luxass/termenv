/**
 * @module unicode
 *
 * Check if the current environment supports Unicode.
 *
 * @example
 * ```ts
 * import { isUnicodeSupported } from "termenv/unicode";
 *
 * isUnicodeSupported();
 * // => true
 * ```
 */

import process from "node:process";
import tty from "node:tty";

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
