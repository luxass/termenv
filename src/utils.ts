export const RESET = "\x1B[2J\x1B[0;0H";

export const ERASE_SCREEN = "\x1B[2J";
export const ERASE_SCREEN_LEFT = "\x1B[1J";
export const ERASE_SCREEN_RIGHT = "\x1B[J";

export const ERASE_LINE = "\x1B[2K";
export const ERASE_LINE_LEFT = "\x1B[1K";
export const ERASE_LINE_RIGHT = "\x1B[K";

// eslint-disable-next-line no-control-regex
export const ANSI_REGEX = /[\u001B\u009B][[\]()#;?]*(?:(?:(?:;[-\w/#&.:=?%@~]+)+|[a-zA-Z\d]+(?:;[-\w/#&.:=?%@~]*)*)?\u0007|(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-ntqry=><~])/g;

/**
 * Strip Ansi Escape Codes from a string
 * @param {string} text - The text to strip
 * @returns {string} The stripped text without ansi escape codes
 */
export function strip(text: string): string {
  return text.replace(ANSI_REGEX, "");
}
