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
  return !!argv.find((arg) => regex.test(arg));
}

const FORCE_MAP: Record<string, ColorSpace> = {
  false: SPACE_MONO,
  0: SPACE_MONO,
  1: SPACE_16_COLORS,
  2: SPACE_256_COLORS,
  3: SPACE_TRUE_COLORS,
};

export function getColorSpace<TGlobal = typeof globalThis>(mockGlobal?: TGlobal): ColorSpace {
  let colorSpace: ColorSpace = NO_COLOR;
  const environment = getTerminalEnvironment(mockGlobal);

  // When FORCE_COLOR is present and not an empty string (regardless of its value, except `false` or `0`),
  // it should force the addition of ANSI color.
  // See https://force-color.org
  const FORCE_COLOR = "FORCE_COLOR";
  const forceColorValue = environment.env[FORCE_COLOR];
  const forceColor = FORCE_MAP[forceColorValue!] ?? NO_COLOR;

  const isForceEnabled
    = (FORCE_COLOR in environment.env && forceColor)
      || hasFlag(environment.argv, /^-{1,2}color=?(?:true|always)?$/);

  if (isForceEnabled) {
    colorSpace = forceColor;
  }

  if (colorSpace === NO_COLOR) colorSpace = getColorSpaceByRuntime(environment);

  if (!forceColor || !!environment.env.NO_COLOR || hasFlag(environment.argv, /^-{1,2}(?:no-color|color=(?:false|never))$/)) {
    return SPACE_MONO;
  }

  return isForceEnabled && !colorSpace ? SPACE_TRUE_COLORS : colorSpace;
}

export const COLORTERM_MAP: Record<string, ColorSpace> = {
  "24bit": SPACE_TRUE_COLORS,
  "truecolor": SPACE_TRUE_COLORS,
  "ansi256": SPACE_256_COLORS,
  "ansi": SPACE_16_COLORS,
};

export function getColorSpaceByRuntime(environment: TerminalEnvironmentConfig): ColorSpace {
  const { env, isTTY, runtime } = environment;

  const level = COLORTERM_MAP[env.COLORTERM!];
  // If COLORTERM is set, we use it to determine the color space.
  if (level) return level;

  if (runtime === "browser") {
    // In a browser environment, we assume true color support.
    return SPACE_TRUE_COLORS;
  }

  const ciColorSpace = getColorSpaceByCI(environment);
  if (ciColorSpace !== SPACE_MONO) return ciColorSpace;

  // unknown output or colors are not supported
  if (!isTTY || /-mono|dumb/i.test(env.TERM!)) return SPACE_MONO;

  // truecolor support starts from Windows 10 build 14931 (2016-09-21), in 2024 we assume modern Windows is used
  if (env.platform === "win32") return SPACE_TRUE_COLORS;

  // check for 256 colors after ENV variables such as TERM, COLORTERM, TERMINAL_EMULATOR etc.
  // terminals, that support 256 colors, e.g., native macOS terminal
  if (/-256(?:colou?r)?$/i.test(env.TERM!)) return SPACE_256_COLORS;

  // We default to 16-color support if no other conditions are met.
  // This is safe since we have already checked most of the known terminals supporting 256 colors.
  return SPACE_16_COLORS;
}

const TRUE_COLOR_CIS = [
  "GITHUB_ACTIONS",
  "GITEA_ACTIONS",
];

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
 * import { getTerminalEnvironment } from "termenv/env";
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
  if (environment.env.TEAMCITY_VERSION) return SPACE_256_COLORS;

  // Azure DevOps CI
  // Azure DevOps doesn't set "CI" variable, but it sets "TF_BUILD" variable
  // https://learn.microsoft.com/en-us/azure/devops/pipelines/build/variables?view=azure-devops&tabs=yaml
  if (environment.env.TF_BUILD) return SPACE_16_COLORS;

  // CI tools
  // https://github.com/watson/ci-info/blob/master/vendors.json
  if (environment.env.CI) {
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
