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
import { hasValue } from "./runtime-global";

export type ColorSpace = -1 | 0 | 1 | 2 | 3;

export const NO_COLOR = -1;
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
  return argv.some((arg) => regex.test(arg));
}

// Maps, not object literals, so values such as `FORCE_COLOR=constructor` don't match `Object.prototype` keys.
const FORCE_MAP: ReadonlyMap<string, ColorSpace> = new Map([
  ["false", SPACE_MONO],
  ["0", SPACE_MONO],
  ["1", SPACE_16_COLORS],
  ["2", SPACE_256_COLORS],
  ["3", SPACE_TRUE_COLORS],
]);

export function getColorSpace<TGlobal = typeof globalThis>(mockGlobal?: TGlobal): ColorSpace {
  let colorSpace: ColorSpace = NO_COLOR;
  const environment = getTerminalEnvironment(mockGlobal);

  // When FORCE_COLOR is present and not an empty string (regardless of its value, except `false` or `0`),
  // it should force the addition of ANSI color.
  // See https://force-color.org
  const FORCE_COLOR = "FORCE_COLOR";
  const forceColorValue = environment.env[FORCE_COLOR];
  const forceColor = FORCE_MAP.get(forceColorValue ?? "") ?? NO_COLOR;

  const isForceDisabled = forceColor === SPACE_MONO;
  const isForceEnabled =
    (FORCE_COLOR in environment.env && !isForceDisabled) ||
    hasFlag(environment.argv, /^-{1,2}color=?(?:true|always)?$/u);

  if (isForceEnabled) {
    colorSpace = forceColor;
  }

  if (colorSpace === NO_COLOR) colorSpace = getColorSpaceByRuntime(environment);

  if (
    isForceDisabled ||
    hasValue(environment.env.NO_COLOR) ||
    hasFlag(environment.argv, /^-{1,2}(?:no-color|color=(?:false|never))$/u)
  ) {
    return SPACE_MONO;
  }

  if (isForceEnabled && colorSpace === SPACE_MONO) {
    // Forced colors don't need a TTY, so use the COLORTERM level when the terminal reports one.
    return getColorSpaceByColorTerm(environment.env) ?? SPACE_TRUE_COLORS;
  }

  return colorSpace;
}

const COLORTERM_MAP: ReadonlyMap<string, ColorSpace> = new Map([
  ["24bit", SPACE_TRUE_COLORS],
  ["truecolor", SPACE_TRUE_COLORS],
  ["ansi256", SPACE_256_COLORS],
  ["yes", SPACE_256_COLORS],
  ["true", SPACE_256_COLORS],
  ["ansi", SPACE_16_COLORS],
]);

/**
 * Reads the color level from `COLORTERM`, or returns `undefined` when it isn't set to a known value.
 *
 * GNU screen passes `COLORTERM=truecolor` through from the outer terminal, but it renders only 256 colors.
 * tmux also uses `TERM=screen*`, but it renders truecolor and sets `TERM_PROGRAM=tmux`.
 */
function getColorSpaceByColorTerm(env: TerminalEnvironmentConfig["env"]): ColorSpace | undefined {
  const colorTermSpace = COLORTERM_MAP.get(env.COLORTERM?.toLowerCase() ?? "");

  if (
    colorTermSpace === SPACE_TRUE_COLORS &&
    env.TERM?.startsWith("screen") === true &&
    env.TERM_PROGRAM !== "tmux"
  ) {
    return SPACE_256_COLORS;
  }

  return colorTermSpace;
}

/**
 * `TERM` values of terminals that render truecolor, even when they don't set `COLORTERM`.
 */
const TRUE_COLOR_TERMS: ReadonlySet<string> = new Set([
  "alacritty",
  "contour",
  "rio",
  "wezterm",
  "xterm-ghostty",
  "xterm-kitty",
]);

export function getColorSpaceByRuntime(environment: TerminalEnvironmentConfig): ColorSpace {
  const { env, isTTY, platform, runtime } = environment;

  // COLORTERM sets the color level. It doesn't say whether the output can show colors.
  // Terminals export it to every child process, so it is also set when output goes to a pipe or a file.
  const colorTermSpace = getColorSpaceByColorTerm(env);

  if (runtime === "browser") {
    // In a browser environment, we assume true color support.
    return colorTermSpace ?? SPACE_TRUE_COLORS;
  }

  const ciColorSpace = getColorSpaceByCI(environment);
  if (ciColorSpace !== SPACE_MONO) return colorTermSpace ?? ciColorSpace;

  // unknown output or colors are not supported
  if (!isTTY || /-mono|dumb/iu.test(env.TERM!)) return SPACE_MONO;

  if (colorTermSpace !== undefined) return colorTermSpace;

  // Google Cloud Shell renders truecolor but doesn't set COLORTERM.
  if (env.GOOGLE_CLOUD_SHELL === "true") return SPACE_TRUE_COLORS;

  // truecolor support starts from Windows 10 build 14931 (2016-09-21), in 2024 we assume modern Windows is used
  if (platform === "win32") return SPACE_TRUE_COLORS;

  if (env.TERM !== undefined && TRUE_COLOR_TERMS.has(env.TERM)) return SPACE_TRUE_COLORS;

  // check for 256 colors after ENV variables such as TERM, COLORTERM, TERMINAL_EMULATOR etc.
  // terminals, that support 256 colors, e.g., native macOS terminal
  if (/-256(?:colou?r)?$/iu.test(env.TERM!)) return SPACE_256_COLORS;

  // We default to 16-color support if no other conditions are met.
  // This is safe since we have already checked most of the known terminals supporting 256 colors.
  return SPACE_16_COLORS;
}

const TRUE_COLOR_CIS = ["GITHUB_ACTIONS", "GITEA_ACTIONS"];

/**
 * Determines the color space support level for Continuous Integration (CI) environments.
 *
 * This function detects specific CI platforms and returns the appropriate color support level
 * based on their known capabilities. CI environments typically don't have TTY output but
 * may still support ANSI colors for build logs and console output.
 *
 * @param {TerminalEnvironmentConfig} environment - The terminal environment configuration containing environment variables
 * @returns {ColorSpace} The color space level supported by the detected CI environment:
 *   - `SPACE_TRUE_COLORS` (3) for GitHub Actions
 *   - `SPACE_256_COLORS` (2) for JetBrains TeamCity
 *   - `SPACE_16_COLORS` (1) for Azure DevOps and other CI environments
 *   - `undefined` if no CI environment is detected
 *
 * @example
 * ```ts
 * import { getTerminalEnvironment } from "termenv";
 * import { getColorSpaceByCI } from "termenv/supports";
 *
 * const env = getTerminalEnvironment();
 * const colorSpace = getColorSpaceByCI(env);
 *
 * if (colorSpace === SPACE_TRUE_COLORS) {
 *   console.log('Running in GitHub Actions with true color support');
 * } else if (colorSpace === SPACE_16_COLORS) {
 *   console.log('Running in CI with basic color support');
 * } else if (colorSpace === SPACE_MONO) {
 *   console.log('Running in CI with no color support');
 * }
 * ```
 */
export function getColorSpaceByCI(environment: TerminalEnvironmentConfig): ColorSpace {
  // https://youtrack.jetbrains.com/issue/TW-62063/Expand-ANSI-coloring-support-to-include-256-color-set
  // JetBrains TeamCity support 256 colors since 2020.1.1 (2020-06-23)
  if (hasValue(environment.env.TEAMCITY_VERSION)) return SPACE_256_COLORS;

  // Azure DevOps CI
  // Azure DevOps doesn't set "CI" variable, but it sets "TF_BUILD" variable
  // https://learn.microsoft.com/en-us/azure/devops/pipelines/build/variables?view=azure-devops&tabs=yaml
  if (hasValue(environment.env.TF_BUILD)) return SPACE_16_COLORS;

  // CI tools
  // https://github.com/watson/ci-info/blob/master/vendors.json
  if (hasValue(environment.env.CI)) {
    if (TRUE_COLOR_CIS.some((ci) => environment.env[ci] != null)) {
      return SPACE_TRUE_COLORS;
    }

    // others CI supports only 16 colors
    return SPACE_16_COLORS;
  }

  return SPACE_MONO;
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
