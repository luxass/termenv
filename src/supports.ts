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

import type { TerminalEnvironmentConfig } from "./env";
import { getTerminalEnvironment } from "./env";

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

export function getColorSpace<TGlobal = typeof globalThis>(mockGlobal?: TGlobal): ColorSpace {
  let colorSpace = -1;
  const environment = getTerminalEnvironment(mockGlobal);

  // runtime is deno, and no env is set due to missing `--allow-env` flag
  if (environment.runtime === "deno" && Object.keys(environment.env).length === 0) {
    colorSpace = SPACE_MONO;
  }

  // When FORCE_COLOR is present and not an empty string (regardless of its value, except `false` or `0`),
  // it should force the addition of ANSI color.
  // See https://force-color.org
  const FORCE_COLOR = "FORCE_COLOR";
  const forceColorValue = environment.env[FORCE_COLOR];
  const forceColorNum = Number.parseInt(forceColorValue!);
  const forceColor
    = forceColorValue === "false"
      ? SPACE_MONO
      : Number.isNaN(forceColorNum)
        ? SPACE_TRUE_COLORS
        : forceColorNum;

  const isForceDisabled
    = "NO_COLOR" in environment.env
      || forceColor === SPACE_MONO
    // --no-color --color=false --color=never
      || hasFlag(environment.argv, /^-{1,2}(?:no-color|color=(?:false|never))$/);

  // --color --color=true --color=always
  const isForceEnabled
    = (FORCE_COLOR in environment.env && forceColor)
      || hasFlag(environment.argv, /^-{1,2}color=?(?:true|always)?$/);

  if (isForceDisabled) return SPACE_MONO;

  if (colorSpace < 0) {
    colorSpace = getColorSpaceByRuntime(environment);
  }

  return isForceEnabled && colorSpace === SPACE_MONO
    ? SPACE_TRUE_COLORS
    : colorSpace as ColorSpace;
}

const TRUE_COLOR_CI = [
  "GITHUB_ACTIONS",
  "GITEA_ACTIONS",
];

export function getColorSpaceByRuntime(environment: TerminalEnvironmentConfig): ColorSpace {
  const { TERM, COLORTERM } = environment.env;

  // Azure DevOps CI
  // https://learn.microsoft.com/en-us/azure/devops/pipelines/build/variables?view=azure-devops&tabs=yaml
  if ("TF_BUILD" in environment.env) return SPACE_16_COLORS;

  // https://youtrack.jetbrains.com/issue/TW-62063/Expand-ANSI-coloring-support-to-include-256-color-set
  // JetBrains TeamCity support 256 colors since 2020.1.1 (2020-06-23)
  if ("TEAMCITY_VERSION" in environment.env) return SPACE_256_COLORS;

  // CI tools
  // https://github.com/watson/ci-info/blob/master/vendors.json
  if ("CI" in environment.env) {
    if (TRUE_COLOR_CI.some((key) => key in environment.env)) return SPACE_TRUE_COLORS;

    // others CI supports only 16 colors
    return SPACE_16_COLORS;
  }

  // unknown output or colors are not supported
  if (!environment.isTTY || /-mono|dumb/i.test(TERM!)) return SPACE_MONO;

  // truecolor support starts from Windows 10 build 14931 (2016-09-21), in 2024 we assume modern Windows is used
  if (environment.platform === "win32") return SPACE_TRUE_COLORS;

  // terminals, that support truecolor, e.g., iTerm, VSCode
  if (COLORTERM === "truecolor" || COLORTERM === "24bit") return SPACE_TRUE_COLORS;

  // kitty is GPU based terminal emulator
  if (TERM === "xterm-kitty") return SPACE_TRUE_COLORS;

  // check for 256 colors after ENV variables such as TERM, COLORTERM, TERMINAL_EMULATOR etc.
  // terminals, that support 256 colors, e.g., native macOS terminal
  if (/-256(?:colou?r)?$/i.test(TERM!)) return SPACE_256_COLORS;

  // known terminals supporting 16 colors
  if (/^screen|^tmux|^xterm|^vt[1-5]\d\d?|^ansi|color|cygwin|linux|mintty|rxvt/i.test(TERM!)) return SPACE_16_COLORS;

  // if we can't detect the terminal, we assume it supports true colors
  // because most modern terminals support true colors
  return SPACE_TRUE_COLORS;
}

/**
 * Checks if the terminal supports true color (24-bit color).
 *
 * @param {typeof globalThis?} mockGlobal global object for testing purposes
 * @returns {boolean} Returns true if the terminal supports true color, false otherwise
 */
export function isTrueColorSupported(mockGlobal?: typeof globalThis): boolean {
  return getColorSpace(mockGlobal) === SPACE_TRUE_COLORS;
}

/**
 * Determines if the terminal supports 256 colors.
 *
 * @param {typeof globalThis?} mockGlobal global object for testing purposes
 * @returns {boolean} Returns true if the terminal supports 256 colors, false otherwise
 */
export function is256ColorSupported(mockGlobal?: typeof globalThis): boolean {
  return getColorSpace(mockGlobal) >= SPACE_256_COLORS;
}

/**
 * Determines if the terminal supports 16 colors.
 *
 * @param {typeof globalThis?} mockGlobal global object for testing purposes
 * @returns {boolean} Returns true if the terminal supports 16 colors, false otherwise
 */
export function is16ColorSupported(mockGlobal?: typeof globalThis): boolean {
  return getColorSpace(mockGlobal) >= SPACE_16_COLORS;
}

/**
 * Determines if the terminal or environment supports colored output.
 *
 * @param {typeof globalThis?} mockGlobal global object for testing purposes
 * @returns {boolean} Returns true if colors are supported, false otherwise
 */
export function isColorsSupported(mockGlobal?: typeof globalThis): boolean {
  return getColorSpace(mockGlobal) > SPACE_MONO;
}
