import tty from "node:tty";
import process from "node:process";
import { release } from "node:os";

/**
 * Get the supported color mode based on the environment
 * @returns {"truecolor" | "256" | "16" | "none"} The supported color mode
 */
export function getSupportedColorMode(): "truecolor" | "256" | "16" | "none" {
  const {
    env = {},
    argv = [],
    platform = "",
  } = process;

  if ("NO_COLOR" in env || argv.includes("--no-color")) {
    return "none";
  }

  if ("FORCE_COLOR" in env || argv.includes("--color")) {
    return "truecolor";
  }

  if ("TF_BUILD" in env && "AGENT_NAME" in env) {
    return "16";
  }

  if (!tty.isatty(1) && !tty.isatty(2)) {
    return "none";
  }

  if (env.TERM === "dumb") {
    return "none";
  }

  if (platform === "win32") {
    const osRelease = release().split(".");
    if (
      Number(osRelease[0]) >= 10
      && Number(osRelease[2]) >= 10_586
    ) {
      return Number(osRelease[2]) >= 14_931 ? "truecolor" : "256";
    }

    return "16";
  }

  if ("CI" in env) {
    if ("GITHUB_ACTIONS" in env || "GITEA_ACTIONS" in env) {
      return "truecolor";
    }

    if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "BUILDKITE", "DRONE"].some((ci) => ci in env) || env.CI_NAME === "codeship") {
      return "16";
    }

    return "none";
  }

  if ("TEAMCITY_VERSION" in env) {
    return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION!) ? "16" : "none";
  }

  if (env.COLORTERM === "truecolor") {
    return "truecolor";
  }

  if (/-256(color)?$/i.test(env.TERM!)) {
    return "256";
  }

  if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM!)) {
    return "16";
  }

  if ("COLORTERM" in env) {
    return "16";
  }

  return "none";
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
  return getSupportedColorMode() !== "none";
}

/**
 * Check if the environment supports true color
 * @returns {boolean} Whether the environment supports true color
 */
export function isTrueColorSupported(): boolean {
  return getSupportedColorMode() === "truecolor";
}

/**
 * Check if the environment supports 256 colors
 * @returns {boolean} Whether the environment supports 256 colors
 */
export function is256ColorSupported(): boolean {
  return getSupportedColorMode() === "256";
}

/**
 * Check if the environment supports 16 colors
 * @returns {boolean} Whether the environment supports 16 colors
 */
export function is16ColorSupported(): boolean {
  return getSupportedColorMode() === "16";
}
