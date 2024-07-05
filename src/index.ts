import tty from "node:tty";
import process from "node:process";
import os from "node:os";

/**
 * Get the supported color mode based on the environment
 * @returns {0 | 1 | 2 | 3} The supported color mode
 */
export function getSupportedLevel(): 0 | 1 | 2 | 3 {
  const { env, argv, platform } = process;

  if ("NO_COLOR" in env || argv.includes("--no-color")) {
    return 0;
  }

  if ("FORCE_COLOR" in env || argv.includes("--color")) {
    return 3;
  }

  if ("TF_BUILD" in env && "AGENT_NAME" in env) {
    return 1;
  }

  if (!tty.isatty(1) && !tty.isatty(2)) {
    return 0;
  }

  if (env.TERM === "dumb") {
    return 0;
  }

  if ("CI" in env) {
    if ("GITHUB_ACTIONS" in env || "GITEA_ACTIONS" in env) {
      return 3;
    }

    if (
      [
        "TRAVIS",
        "CIRCLECI",
        "APPVEYOR",
        "GITLAB_CI",
        "BUILDKITE",
        "DRONE",
      ].some((ci) => env[ci]) || env.CI_NAME === "codeship"
    ) {
      return 1;
    }

    return 0;
  }

  if (platform === "win32") {
    const osRelease = os.release().split(".");
    if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10_586) {
      return Number(osRelease[2]) >= 14_931 ? 3 : 2;
    }

    return 1;
  }

  if ("TEAMCITY_VERSION" in env) {
    // eslint-disable-next-line regexp/no-unused-capturing-group
    return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION!) ? 1 : 0;
  }

  if (env.COLORTERM === "truecolor") {
    return 3;
  }

  // eslint-disable-next-line regexp/no-unused-capturing-group
  if (/-256(color)?$/i.test(env.TERM!)) {
    return 2;
  }

  if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM!)) {
    return 1;
  }

  if ("COLORTERM" in env) {
    return 1;
  }

  return 0;
}

/**
 * Check if the browser supports colors
 * @returns {boolean} Whether the browser supports colors
 *
 * @example
 * ```js
 * import { isColorsSupported } from "termenv";
 *
 * isColorsSupported();
 * // => true
 * ```
 */
export function isColorsSupported(): boolean {
  return getSupportedLevel() > 0;
}

/**
 * Check if the environment supports true color
 * @returns {boolean} Whether the environment supports true color
 */
export function isTrueColorSupported(): boolean {
  return getSupportedLevel() >= 3;
}

/**
 * Check if the environment supports 256 colors
 * @returns {boolean} Whether the environment supports 256 colors
 */
export function is256ColorSupported(): boolean {
  return getSupportedLevel() >= 2;
}

/**
 * Check if the environment supports 16 colors
 * @returns {boolean} Whether the environment supports 16 colors
 */
export function is16ColorSupported(): boolean {
  return getSupportedLevel() >= 1;
}
