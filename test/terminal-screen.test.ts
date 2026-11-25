// Screen-level tests: does a real terminal emulator do what each termenv builder documents?
import { describe, expect, it } from "vitest";

import {
  ALT_SCREEN,
  changeScrollingRegion,
  clearLines,
  copyToClipboard,
  cursorBack,
  cursorDown,
  cursorForward,
  cursorNextLine,
  cursorPrevLine,
  cursorUp,
  deleteLines,
  DISABLE_MOUSE_CELL_MOTION,
  ENABLE_BRACKETED_PASTE,
  ENABLE_MOUSE,
  ENABLE_MOUSE_ALL_MOTION,
  ENABLE_MOUSE_CELL_MOTION,
  ENABLE_MOUSE_PRESS,
  EXIT_ALT_SCREEN,
  HIDE_CURSOR,
  hyperlink,
  insertLines,
  moveCursor,
  notify,
  RESTORE_CURSOR_POSITION,
  SAVE_CURSOR_POSITION,
  setBackgroundColor,
  setWindowTitle,
  SHOW_CURSOR,
} from "../src/utils";
import { renderInTerminal } from "./terminal-screen";

const plainTerminal = { process: { env: { TERM: "xterm-256color" } } };

describe("cursor", () => {
  it("moveCursor(row, column) moves to that row and column, starting at 1", async () => {
    const screen = await renderInTerminal(moveCursor(3, 5) + "X");
    expect(screen.lines[2]).toBe("    X");
  });

  it("relative moves go in the documented direction", async () => {
    const start = moveCursor(3, 5);
    expect((await renderInTerminal(start + cursorUp(2))).cursor).toMatchObject({ row: 0, col: 4 });
    expect((await renderInTerminal(start + cursorDown(2))).cursor).toMatchObject({
      row: 4,
      col: 4,
    });
    expect((await renderInTerminal(start + cursorForward(3))).cursor).toMatchObject({
      row: 2,
      col: 7,
    });
    expect((await renderInTerminal(start + cursorBack(3))).cursor).toMatchObject({
      row: 2,
      col: 1,
    });
  });

  it("next and previous line also move to the first column", async () => {
    const start = moveCursor(3, 5);
    expect((await renderInTerminal(start + cursorNextLine())).cursor).toMatchObject({
      row: 3,
      col: 0,
    });
    expect((await renderInTerminal(start + cursorPrevLine(2))).cursor).toMatchObject({
      row: 0,
      col: 0,
    });
  });

  it("save and restore the cursor position", async () => {
    const screen = await renderInTerminal(
      moveCursor(2, 3) + SAVE_CURSOR_POSITION + moveCursor(5, 9) + RESTORE_CURSOR_POSITION,
    );
    expect(screen.cursor).toMatchObject({ row: 1, col: 2 });
  });

  it("hide and show the cursor", async () => {
    expect((await renderInTerminal(HIDE_CURSOR)).cursor.visible).toBe(false);
    expect((await renderInTerminal(HIDE_CURSOR + SHOW_CURSOR)).cursor.visible).toBe(true);
  });
});

describe("lines", () => {
  it("clearLines clears the current line and the lines above it, and keeps the column", async () => {
    const screen = await renderInTerminal("one\r\ntwo\r\nthree" + clearLines(1));
    expect(screen.lines.slice(0, 3)).toEqual(["one", "", ""]);
    expect(screen.cursor).toMatchObject({ row: 1, col: 5 });
  });

  it("insertLines and deleteLines move the lines below the cursor", async () => {
    const setup = "a\r\nb\r\nc" + moveCursor(2, 1);
    expect((await renderInTerminal(setup + insertLines(1))).lines.slice(0, 4)).toEqual([
      "a",
      "",
      "b",
      "c",
    ]);
    expect((await renderInTerminal(setup + deleteLines(1))).lines.slice(0, 3)).toEqual([
      "a",
      "c",
      "",
    ]);
  });

  it("changeScrollingRegion scrolls only the rows from top to bottom", async () => {
    // Rows 2 to 5 scroll. Row 1 is a fixed header and row 6 a fixed footer.
    // The region ends above the last row, so a missing bottom margin, which defaults to the last row, fails.
    const screen = await renderInTerminal(
      `header${moveCursor(6, 1)}footer${changeScrollingRegion(2, 5)}${moveCursor(5, 1)}1\r\n2\r\n3`,
      { rows: 6 },
    );
    expect(screen.lines).toEqual(["header", "", "1", "2", "3", "footer"]);
  });
});

describe("screen and input modes", () => {
  it("the alternate screen hides the normal screen and brings it back with the cursor", async () => {
    const before = "shell output" + moveCursor(2, 4);
    const inside = await renderInTerminal(before + ALT_SCREEN + "app");
    expect(inside.buffer).toBe("alternate");
    expect(inside.lines[0]).not.toContain("shell output");

    const after = await renderInTerminal(
      before + ALT_SCREEN + "app" + moveCursor(5, 9) + EXIT_ALT_SCREEN,
    );
    expect(after.buffer).toBe("normal");
    expect(after.lines[0]).toBe("shell output");
    expect(after.cursor).toMatchObject({ row: 1, col: 3 });
  });

  it.each([
    ["ENABLE_MOUSE_PRESS", ENABLE_MOUSE_PRESS, "x10"],
    ["ENABLE_MOUSE", ENABLE_MOUSE, "vt200"],
    ["ENABLE_MOUSE_CELL_MOTION", ENABLE_MOUSE_CELL_MOTION, "drag"],
    ["ENABLE_MOUSE_ALL_MOTION", ENABLE_MOUSE_ALL_MOTION, "any"],
  ])("%s turns on the documented mouse mode", async (_name, sequence, mode) => {
    expect((await renderInTerminal(sequence)).mouseTracking).toBe(mode);
  });

  it("disabling mouse cell motion turns mouse tracking off", async () => {
    expect(
      (await renderInTerminal(ENABLE_MOUSE_CELL_MOTION + DISABLE_MOUSE_CELL_MOTION)).mouseTracking,
    ).toBe("none");
  });

  it("bracketed paste", async () => {
    expect((await renderInTerminal(ENABLE_BRACKETED_PASTE)).bracketedPaste).toBe(true);
  });
});

describe("OSC", () => {
  it("hyperlink attaches the URL to the link text only", async () => {
    const screen = await renderInTerminal(hyperlink("https://example.com", "link") + " plain");
    expect(screen.lines[0]).toBe("link plain");
    expect(screen.hyperlinkAt(0, 0)).toBe("https://example.com");
    expect(screen.hyperlinkAt(0, 3)).toBe("https://example.com");
    expect(screen.hyperlinkAt(0, 5)).toBeNull();
  });

  it("setWindowTitle sets the window title", async () => {
    expect((await renderInTerminal(setWindowTitle("my title"))).title).toBe("my title");
  });

  it("copyToClipboard reaches the OSC 52 handler with base64 data", async () => {
    const screen = await renderInTerminal(copyToClipboard("hello", { mockGlobal: plainTerminal }));
    expect(screen.osc[52]).toEqual(["c;aGVsbG8="]);
  });

  it("setBackgroundColor reaches the OSC 11 handler", async () => {
    expect((await renderInTerminal(setBackgroundColor("#1e1e2e"))).osc[11]).toEqual(["#1e1e2e"]);
  });

  it("notify reaches the OSC 777 handler and prints nothing", async () => {
    const screen = await renderInTerminal(notify("Build", "done"));
    expect(screen.osc[777]).toEqual(["notify;Build;done"]);
    expect(screen.lines[0]).toBe("");
  });
});
