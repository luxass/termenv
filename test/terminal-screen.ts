/**
 * Renders bytes with @xterm/headless, the terminal emulator inside VS Code, and reads back what the
 * terminal did with them: the screen, the cursor, modes, the title, links, and OSC payloads.
 *
 * String tests check that a builder emits the bytes we expect. These checks show that a terminal
 * interprets those bytes the way the builder's documentation says.
 */

import { Terminal } from "@xterm/headless";

export interface TerminalScreen {
  /** The text of each row, without trailing spaces. */
  lines: string[];

  /** The cursor position, starting at 0, and whether the cursor is visible. */
  cursor: { row: number; col: number; visible: boolean };

  /** Which screen buffer is active. */
  buffer: "normal" | "alternate";

  /** The active mouse reporting mode. */
  mouseTracking: "none" | "x10" | "vt200" | "drag" | "any";

  /** Whether bracketed paste is on. */
  bracketedPaste: boolean;

  /** The last window title the terminal received, or `undefined`. */
  title: string | undefined;

  /** Returns the URL of the hyperlink at a cell, or `null` when the cell has no link. */
  hyperlinkAt: (row: number, col: number) => string | null;

  /** The payloads the terminal received for each recorded OSC code, in order. */
  osc: Partial<Record<number, string[]>>;
}

/**
 * The private parts of xterm.js that these checks read. xterm has no public API for cursor visibility
 * or for the URL of an OSC 8 link, so the checks reach into `_core`, as termless does.
 * Keep every private access in this file, so an xterm upgrade can break only one place.
 */
interface XtermCore {
  coreService: { isCursorHidden: boolean };
  _oscLinkService: { getLinkData: (linkId: number) => { uri: string } | undefined };
}

interface XtermCell {
  extended?: { urlId?: number };
}

const RECORDED_OSC_CODES = [8, 10, 11, 12, 52, 110, 111, 112, 777];

/**
 * Writes `data` to a new terminal and returns the terminal's state afterwards.
 */
export async function renderInTerminal(
  data: string,
  size: { cols?: number; rows?: number } = {},
): Promise<TerminalScreen> {
  const terminal = new Terminal({
    cols: size.cols ?? 20,
    rows: size.rows ?? 6,
    allowProposedApi: true,
  });

  let title: string | undefined;
  terminal.onTitleChange((value) => {
    title = value;
  });

  // Record OSC payloads. Returning false keeps xterm's own handling of each sequence.
  const osc: Partial<Record<number, string[]>> = {};
  for (const code of RECORDED_OSC_CODES) {
    terminal.parser.registerOscHandler(code, (payload) => {
      (osc[code] ??= []).push(payload);
      return false;
    });
  }

  await new Promise<void>((resolve) => {
    terminal.write(data, resolve);
  });

  const active = terminal.buffer.active;
  const core = (terminal as unknown as { _core: XtermCore })._core;
  const lines = Array.from(
    { length: terminal.rows },
    (_, row) => active.getLine(row)?.translateToString(true) ?? "",
  );

  return {
    lines,
    cursor: { row: active.cursorY, col: active.cursorX, visible: !core.coreService.isCursorHidden },
    buffer: active.type,
    mouseTracking: terminal.modes.mouseTrackingMode,
    bracketedPaste: terminal.modes.bracketedPasteMode,
    title,
    hyperlinkAt(row, col) {
      const cell = active.getLine(row)?.getCell(col) as XtermCell | undefined;
      const linkId = cell?.extended?.urlId;
      if (linkId === undefined || linkId === 0) return null;
      return core._oscLinkService.getLinkData(linkId)?.uri ?? null;
    },
    osc,
  };
}
