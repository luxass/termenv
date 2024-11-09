/**
 * @module
 *
 * Termenv is a utility library for working with terminal environments.
 */

export {
  isColorsSupported,
  isTrueColorSupported,
  is256ColorSupported,
  is16ColorSupported,
  getColorSpace,
  SPACE_16_COLORS,
  type ColorSpace,
  SPACE_256_COLORS,
  SPACE_MONO,
  SPACE_TRUE_COLORS,
} from "./supports";

export { getRuntimeConfig, type EnvRuntimeConfig } from "./env";

export { isUnicodeSupported } from "./unicode";

export { getWindowSize } from "./window-size";

export {
  ANSI_REGEX,
  ERASE_LINE,
  ERASE_LINE_LEFT,
  ERASE_LINE_RIGHT,
  ERASE_SCREEN,
  ERASE_SCREEN_LEFT,
  ERASE_SCREEN_RIGHT,
  RESET,
  strip,
} from "./utils";
