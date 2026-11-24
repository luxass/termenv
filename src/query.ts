/**
 * @module query
 *
 * Asks the terminal for its default foreground and background colors (OSC 10 and OSC 11).
 * Ported from https://github.com/muesli/termenv.
 *
 * Queries need an interactive terminal: input and output must both be TTYs, and input must support raw mode.
 * They work in Node.js and Bun. In other environments, they resolve without a terminal answer.
 *
 * Re-exported from `termenv/utils`.
 */

import { parseColorFgBg } from "./color-fgbg";
import { getTerminalEnvironment } from "./env";
import { resolveRuntimeGlobal } from "./runtime-global";

/**
 * A color with red, green, and blue channels from 0 to 255.
 */
export interface TerminalColor {
  red: number;
  green: number;
  blue: number;
}

/**
 * The input stream a query reads the terminal's answer from, such as `process.stdin`.
 */
export interface TerminalInput {
  isTTY?: boolean;
  isRaw?: boolean;
  readableFlowing?: boolean | null;
  setRawMode?: (mode: boolean) => unknown;
  on: (event: "data", listener: (chunk: Uint8Array | string) => void) => unknown;
  off: (event: "data", listener: (chunk: Uint8Array | string) => void) => unknown;
  pause: () => unknown;
  resume: () => unknown;
}

/**
 * The output stream a query writes to, such as `process.stdout`.
 */
export interface TerminalOutput {
  isTTY?: boolean;
  write: (data: string) => unknown;
}

export interface QueryTerminalColorOptions<TGlobal = typeof globalThis> {
  /**
   * The stream to read the answer from.
   *
   * @default process.stdin
   */
  input?: TerminalInput;

  /**
   * The stream to write the query to.
   *
   * @default process.stdout
   */
  output?: TerminalOutput;

  /**
   * How long to wait for an answer, in milliseconds.
   *
   * Terminals without color query support answer at once, so this limit applies only when nothing answers.
   *
   * @default 1000
   */
  timeout?: number;

  /** Optional mock global object for testing purposes. */
  mockGlobal?: TGlobal;
}

const DEFAULT_TIMEOUT = 1000;

// The answer to the color query, for example `ESC ] 11 ; rgb:1e1e/1e1e/2e2e ESC \`.
// The terminator is BEL or ST (ESC \).
// oxlint-disable-next-line no-control-regex -- Terminal answers are made of control characters.
const COLOR_ANSWER = /\u001B\](?<code>\d+);(?<value>[^\u0007\u001B]*)(?:\u0007|\u001B\\)/u;

// The answer to the cursor position query (`CSI 6n`), for example `ESC [ 42 ; 1 R`.
// oxlint-disable-next-line no-control-regex -- Terminal answers are made of control characters.
const CURSOR_POSITION_ANSWER = /\u001B\[\d+;\d+R/u;

// The longest answer buffer to keep. Anything longer means the input isn't a terminal answer.
const MAX_ANSWER_LENGTH = 1024;

// Queries share one input stream, so they run one at a time.
let queryQueue: Promise<unknown> = Promise.resolve();

/**
 * Asks the terminal for its default foreground color (OSC 10).
 *
 * If the terminal doesn't answer, this falls back to the `COLORFGBG` environment variable.
 * It resolves to `undefined` when neither gives a color.
 *
 * @example
 * ```ts
 * import { queryForegroundColor } from "termenv/utils";
 *
 * const color = await queryForegroundColor();
 * // => { red: 205, green: 214, blue: 244 } or undefined
 * ```
 */
export function queryForegroundColor<TGlobal = typeof globalThis>(
  options?: QueryTerminalColorOptions<TGlobal>,
): Promise<TerminalColor | undefined> {
  return queryColor(10, options);
}

/**
 * Asks the terminal for its default background color (OSC 11).
 *
 * If the terminal doesn't answer, this falls back to the `COLORFGBG` environment variable.
 * It resolves to `undefined` when neither gives a color.
 */
export function queryBackgroundColor<TGlobal = typeof globalThis>(
  options?: QueryTerminalColorOptions<TGlobal>,
): Promise<TerminalColor | undefined> {
  return queryColor(11, options);
}

/**
 * Checks whether the terminal has a dark background, so you can pick readable colors.
 *
 * A background with an HSL lightness below 0.5 is dark.
 * When the background color is unknown, this resolves to `true`, the same default as muesli/termenv.
 */
export async function hasDarkBackground<TGlobal = typeof globalThis>(
  options?: QueryTerminalColorOptions<TGlobal>,
): Promise<boolean> {
  const background = await queryBackgroundColor(options);
  if (background === undefined) return true;

  const { red, green, blue } = background;
  const lightness = (Math.max(red, green, blue) + Math.min(red, green, blue)) / 2 / 255;
  return lightness < 0.5;
}

/**
 * Parses an X11 color specification from a terminal answer, such as `rgb:1e1e/1e1e/2e2e`.
 *
 * Each channel has 1 to 4 hex digits. `rgba:` answers are accepted, and their alpha channel is ignored.
 */
function parseXColor(value: string): TerminalColor | undefined {
  const match =
    /^rgba?:(?<red>[\da-f]{1,4})\/(?<green>[\da-f]{1,4})\/(?<blue>[\da-f]{1,4})(?:\/[\da-f]{1,4})?$/iu.exec(
      value,
    );
  if (match?.groups === undefined) return undefined;

  const { red = "", green = "", blue = "" } = match.groups;
  return {
    red: scaleChannel(red),
    green: scaleChannel(green),
    blue: scaleChannel(blue),
  };
}

/**
 * Scales a hex channel with 1 to 4 digits to the range 0 to 255.
 */
function scaleChannel(hexDigits: string): number {
  const maxValue = 16 ** hexDigits.length - 1;
  return Math.round((Number.parseInt(hexDigits, 16) / maxValue) * 255);
}

async function queryColor<TGlobal>(
  code: 10 | 11,
  options: QueryTerminalColorOptions<TGlobal> | undefined,
): Promise<TerminalColor | undefined> {
  const streams = getQueryStreams(options);
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
  const answer =
    streams === undefined
      ? undefined
      : await enqueue(() => readTerminalAnswer(code, streams, timeout));
  const color = answer === undefined ? undefined : parseXColor(answer);
  if (color !== undefined) return color;

  const { env } = getTerminalEnvironment(options?.mockGlobal);
  return parseColorFgBg(env.COLORFGBG, code === 10 ? "foreground" : "background");
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queryQueue.then(task, task);
  // The next query waits for this one to settle, whether it resolves or rejects.
  queryQueue = result.then(settle, settle);
  return result;
}

function settle(): void {
  // Nothing to do. The queue only needs the promise to settle.
}

interface QueryStreams {
  input: TerminalInput;
  setRawMode: (mode: boolean) => unknown;
  write: (data: string) => unknown;
}

/**
 * Returns the streams to query, or `undefined` when the terminal can't answer.
 */
function getQueryStreams<TGlobal>(
  options: QueryTerminalColorOptions<TGlobal> | undefined,
): QueryStreams | undefined {
  const runtimeProcess = resolveRuntimeGlobal(options?.mockGlobal).process;
  const input = options?.input ?? runtimeProcess?.stdin;
  const output: Partial<TerminalOutput> | undefined = options?.output ?? runtimeProcess?.stdout;
  const { env } = getTerminalEnvironment(options?.mockGlobal);

  // screen and tmux can be attached to several terminals at once, so they don't answer for one terminal.
  if (/^(?:screen|tmux|dumb)/u.test(env.TERM ?? "")) return undefined;
  if (input?.isTTY !== true || output?.isTTY !== true) return undefined;

  const { setRawMode } = input;
  const { write } = output;
  if (setRawMode === undefined || write === undefined) return undefined;

  return {
    input,
    setRawMode: setRawMode.bind(input),
    write: write.bind(output),
  };
}

/**
 * Sends the color query, then a cursor position query, and resolves to the color answer.
 *
 * Every terminal answers the cursor position query. Terminals answer in order,
 * so a cursor position answer that arrives first means the terminal doesn't support the color query.
 * This is the same approach as muesli/termenv.
 */
function readTerminalAnswer(
  code: 10 | 11,
  { input, setRawMode, write }: QueryStreams,
  timeout: number,
): Promise<string | undefined> {
  const wasRaw = input.isRaw === true;
  const wasFlowing = input.readableFlowing === true;
  const decoder = new TextDecoder();

  return new Promise<string | undefined>((resolve) => {
    let buffer = "";

    const finish = (answer?: string): void => {
      clearTimeout(timer);
      input.off("data", onData);
      setRawMode(wasRaw);
      // Pause the stream again if it wasn't flowing before, or the open stdin keeps the process running.
      if (!wasFlowing) input.pause();
      resolve(answer);
    };

    const onData = (chunk: Uint8Array | string): void => {
      buffer += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });

      const cursorPosition = CURSOR_POSITION_ANSWER.exec(buffer);
      if (cursorPosition === null) {
        if (buffer.length > MAX_ANSWER_LENGTH) finish();
        return;
      }

      const colorAnswer = COLOR_ANSWER.exec(buffer);
      const answeredFirst = colorAnswer !== null && colorAnswer.index < cursorPosition.index;
      const isAnswerToThisQuery = colorAnswer?.groups?.code === String(code);
      finish(answeredFirst && isAnswerToThisQuery ? colorAnswer.groups?.value : undefined);
    };

    const timer = setTimeout(finish, timeout);

    setRawMode(true);
    input.on("data", onData);
    // A data listener doesn't restart a stream that was paused before, for example by an earlier query.
    input.resume();
    write(`\u001B]${code};?\u001B\\\u001B[6n`);
  });
}
