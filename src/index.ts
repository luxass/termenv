/**
 * @module
 *
 * Termenv is a utility library for working with terminal environments.
 */

export {
  getTerminalEnvironment,
  type TerminalEnvironmentConfig,
} from "./env";

export {
  type ColorSpace,
  getColorSpace,
  is16ColorSupported,
  is256ColorSupported,
  isColorsSupported,
  isTrueColorSupported,
  SPACE_16_COLORS,
  SPACE_256_COLORS,
  SPACE_MONO,
  SPACE_TRUE_COLORS,
} from "./supports";

export { isUnicodeSupported } from "./unicode";

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

export { getWindowSize } from "./window-size";
