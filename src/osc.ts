/**
 * @module osc
 *
 * Builders for OSC (Operating System Command) sequences: hyperlinks, desktop notifications,
 * clipboard copy, the window title, and the terminal's default colors.
 * Ported from https://github.com/muesli/termenv.
 *
 * Every builder returns a string and writes nothing. Re-exported from `termenv/utils`.
 */

import { getTerminalEnvironment } from "./env";

const OSC = "\u001B]";
const BEL = "\u0007";
const ST = "\u001B\\";

// C0 controls, DEL, and C1 controls. Any of them inside an OSC string can end the sequence early
// or start a new one, so caller-supplied values must not contain them.
// oxlint-disable-next-line no-control-regex -- The pattern matches control characters on purpose.
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F]/u;

/**
 * Checks that an OSC parameter has no control characters, so a value can't inject other sequences.
 */
function assertNoControlCharacters(
  functionName: string,
  parameterName: string,
  value: string,
): void {
  if (CONTROL_CHARACTERS.test(value)) {
    throw new TypeError(`${functionName}: ${parameterName} must not contain control characters`);
  }
}

/**
 * Builds a terminal hyperlink (OSC 8).
 *
 * Terminals without OSC 8 support show only `text`.
 * `text` may contain other escape sequences, such as colors. `url` must not contain control characters.
 *
 * @example
 * ```ts
 * import { hyperlink } from "termenv/utils";
 *
 * console.log(hyperlink("https://github.com/luxass/termenv", "termenv"));
 * ```
 */
export function hyperlink(url: string, text: string = url): string {
  assertNoControlCharacters("hyperlink", "url", url);
  return `${OSC}8;;${url}${ST}${text}${OSC}8;;${ST}`;
}

/**
 * Builds a desktop notification (OSC 777).
 *
 * Supported by Ghostty, WezTerm, foot, rxvt-unicode with the notify extension, and others.
 * Terminals without support ignore it.
 * `title` must not contain `;`, which separates the title from the body.
 */
export function notify(title: string, body: string): string {
  assertNoControlCharacters("notify", "title", title);
  assertNoControlCharacters("notify", "body", body);
  if (title.includes(";")) {
    throw new TypeError(
      "notify: title must not contain ';', which separates the title from the body",
    );
  }
  return `${OSC}777;notify;${title};${body}${ST}`;
}

/**
 * Builds a window title change (OSC 2).
 */
export function setWindowTitle(title: string): string {
  assertNoControlCharacters("setWindowTitle", "title", title);
  return `${OSC}2;${title}${BEL}`;
}

/**
 * Builds a change of the terminal's default foreground color (OSC 10).
 *
 * `color` is any color the terminal understands, such as `#ff8800`, `rgb:ff/88/00`, or an X11 color name.
 * Undo it with {@link RESET_FOREGROUND_COLOR}.
 */
export function setForegroundColor(color: string): string {
  assertNoControlCharacters("setForegroundColor", "color", color);
  return `${OSC}10;${color}${BEL}`;
}

/**
 * Builds a change of the terminal's default background color (OSC 11).
 *
 * Undo it with {@link RESET_BACKGROUND_COLOR}.
 */
export function setBackgroundColor(color: string): string {
  assertNoControlCharacters("setBackgroundColor", "color", color);
  return `${OSC}11;${color}${BEL}`;
}

/**
 * Builds a change of the cursor color (OSC 12).
 *
 * Undo it with {@link RESET_CURSOR_COLOR}.
 */
export function setCursorColor(color: string): string {
  assertNoControlCharacters("setCursorColor", "color", color);
  return `${OSC}12;${color}${BEL}`;
}

/** Restores the default foreground color changed with {@link setForegroundColor} (OSC 110). */
export const RESET_FOREGROUND_COLOR = `${OSC}110${BEL}`;

/** Restores the default background color changed with {@link setBackgroundColor} (OSC 111). */
export const RESET_BACKGROUND_COLOR = `${OSC}111${BEL}`;

/** Restores the cursor color changed with {@link setCursorColor} (OSC 112). */
export const RESET_CURSOR_COLOR = `${OSC}112${BEL}`;

export interface CopyToClipboardOptions<TGlobal = typeof globalThis> {
  /**
   * Copy to the X11 primary selection (middle-click paste), not the system clipboard.
   *
   * @default false
   */
  primary?: boolean;

  /** Optional mock global object for testing purposes. */
  mockGlobal?: TGlobal;
}

/**
 * Builds a clipboard copy (OSC 52). The terminal puts `text` on the clipboard, also over SSH.
 *
 * Under GNU screen (`TERM=screen*` without `TERM_PROGRAM=tmux`), the sequence is wrapped so that
 * screen passes it to the outer terminal. tmux handles OSC 52 itself when `set-clipboard` is on.
 * Some terminals limit the size of the copied text or ask the user before they allow it.
 *
 * @example
 * ```ts
 * import { copyToClipboard } from "termenv/utils";
 *
 * process.stdout.write(copyToClipboard("npm install termenv"));
 * ```
 */
export function copyToClipboard<TGlobal = typeof globalThis>(
  text: string,
  options?: CopyToClipboardOptions<TGlobal>,
): string {
  const { env } = getTerminalEnvironment(options?.mockGlobal);
  const clipboard = options?.primary === true ? "p" : "c";
  const encoded = encodeBase64(text);

  const isScreen = env.TERM?.startsWith("screen") === true && env.TERM_PROGRAM !== "tmux";
  if (!isScreen) {
    return `${OSC}52;${clipboard};${encoded}${BEL}`;
  }

  // GNU screen passes a DCS string to the outer terminal unchanged, but limits its length.
  // Split the data into 76-byte chunks, each in its own DCS string, the way go-osc52 does.
  const chunks = encoded.match(/.{1,76}/gu) ?? [""];
  return `\u001BP${OSC}52;${clipboard};${chunks.join(`${ST}\u001BP`)}${BEL}${ST}`;
}

/**
 * Encodes text as UTF-8 and then base64, with APIs available in every supported runtime.
 */
function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }
  return btoa(binary);
}
