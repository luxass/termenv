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
 * @returns {0 | 1 | 2 | 3} The supported color mode
 */
export function getSupportedColorMode(): 0 | 1 | 2 | 3 {
  if (!globalThis.navigator) {
    return 0;
  }

  if (globalThis.navigator?.userAgentData) {
    const brand = navigator.userAgentData?.brands.find(({ brand }) => brand === "Chromium");
    if (brand && +brand?.version > 93) {
      return 3;
    }
  }

  if (/\b(Chrome|Chromium)\//.test(navigator.userAgent)) {
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
  return getSupportedColorMode() > 0;
}

/**
 * Check if the environment supports true color
 * @returns {boolean} Whether the environment supports true color
 */
export function isTrueColorSupported(): boolean {
  return getSupportedColorMode() === 3;
}

/**
 * Check if the environment supports 256 colors
 * @returns {boolean} Whether the environment supports 256 colors
 */
export function is256ColorSupported(): boolean {
  return getSupportedColorMode() >= 2;
}

/**
 * Check if the environment supports 16 colors
 * @returns {boolean} Whether the environment supports 16 colors
 */
export function is16ColorSupported(): boolean {
  return getSupportedColorMode() >= 1;
}
