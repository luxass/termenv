declare global {
  interface Navigator {
    userAgentData?: NavigatorUserAgentData;
  }

  interface NavigatorUserAgentData {
    readonly brands: NavigatorUABrandVersion[];
  }

  interface NavigatorUABrandVersion {
    readonly brand: string;
    readonly version: string;
  }
}

/**
 * Get the supported color mode based on the environment
 * @returns {"truecolor" | "256" | "16" | "none"} The supported color mode
 */
export function getSupportedColorMode(): "truecolor" | "256" | "16" | "none" {
  if (!globalThis.navigator) {
    return "none";
  }

  if (globalThis.navigator?.userAgentData) {
    const brand = navigator.userAgentData?.brands.find(({ brand }) => brand === "Chromium");
    if (brand && +brand?.version > 93) {
      return "truecolor";
    }
  }

  if (/\b(Chrome|Chromium)\//.test(navigator.userAgent)) {
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
