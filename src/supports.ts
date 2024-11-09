/**
 * @module supports
 *
 * Check if the current environment supports colors and which level of color support it has.
 *
 * @example
 * ```ts
 * import { getColorSpace } from "termenv";
 *
 * getColorSpace();
 * // => 0 (no color support)
 *
 * getColorSpace();
 * // => 1 (16 colors)
 *
 * getColorSpace();
 * // => 2 (256 colors)
 *
 * getColorSpace();
 * // => 3 (true colors)
 * ```
 */

import { getRuntimeConfig } from "./env";

export type ColorSpace = 0 | 1 | 2 | 3;

export const SPACE_MONO = 0;
export const SPACE_16_COLORS = 1;
export const SPACE_256_COLORS = 2;
export const SPACE_TRUE_COLORS = 3;

/**
 * Detect whether flags exist in command-line arguments.
 *
 * @param {string[]} argv The command-line arguments.
 * @param {RegExp} regex The RegEx to match all possible flags.
 * @return {boolean}
 */
function hasFlag(argv: string[], regex: RegExp): boolean {
  return !!argv.find((arg) => regex.test(arg));
}

export function getColorSpace(mockGlobal?: typeof globalThis): 0 | 1 | 2 | 3 {
  let colorSpace = -1;
  const runtime = getRuntimeConfig(mockGlobal);

  // runtime is deno, and no env is set due to missing `--allow-env` flag
  if (runtime.runtime === "deno" && Object.keys(runtime.env).length === 0) {
    colorSpace = SPACE_MONO;
  }

  if (colorSpace < 0) {
    colorSpace = SPACE_256_COLORS;
  }

  return colorSpace as ColorSpace;
}
