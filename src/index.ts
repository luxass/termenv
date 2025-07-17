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
} from "./supports";

export {
  SPACE_16_COLORS,
  SPACE_256_COLORS,
  SPACE_MONO,
  SPACE_TRUE_COLORS,
} from "./supports";
