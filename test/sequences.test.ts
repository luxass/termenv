import { describe, expect, it } from "vitest";

import {
  ALT_SCREEN,
  BRACKETED_PASTE_END,
  BRACKETED_PASTE_START,
  changeScrollingRegion,
  clearLines,
  cursorBack,
  cursorDown,
  cursorForward,
  cursorNextLine,
  cursorPrevLine,
  cursorUp,
  deleteLines,
  DISABLE_BRACKETED_PASTE,
  DISABLE_MOUSE,
  DISABLE_MOUSE_ALL_MOTION,
  DISABLE_MOUSE_CELL_MOTION,
  DISABLE_MOUSE_EXTENDED_MODE,
  DISABLE_MOUSE_HILITE,
  DISABLE_MOUSE_PIXELS_MODE,
  DISABLE_MOUSE_PRESS,
  ENABLE_BRACKETED_PASTE,
  ENABLE_MOUSE,
  ENABLE_MOUSE_ALL_MOTION,
  ENABLE_MOUSE_CELL_MOTION,
  ENABLE_MOUSE_EXTENDED_MODE,
  ENABLE_MOUSE_HILITE,
  ENABLE_MOUSE_PIXELS_MODE,
  ENABLE_MOUSE_PRESS,
  EXIT_ALT_SCREEN,
  HIDE_CURSOR,
  insertLines,
  moveCursor,
  RESTORE_CURSOR_POSITION,
  RESTORE_SCREEN,
  SAVE_CURSOR_POSITION,
  SAVE_SCREEN,
  SHOW_CURSOR,
} from "../src/utils";

const ESC = "\u001B";

describe("count sequences", () => {
  it.each([
    ["cursorUp", cursorUp, "A"],
    ["cursorDown", cursorDown, "B"],
    ["cursorForward", cursorForward, "C"],
    ["cursorBack", cursorBack, "D"],
    ["cursorNextLine", cursorNextLine, "E"],
    ["cursorPrevLine", cursorPrevLine, "F"],
    ["insertLines", insertLines, "L"],
    ["deleteLines", deleteLines, "M"],
  ])("%s builds CSI n %s", (_name, build, finalByte) => {
    expect(build(3)).toBe(`${ESC}[3${finalByte}`);
    expect(build(1)).toBe(`${ESC}[1${finalByte}`);
  });

  it.each([
    ["cursorUp", cursorUp],
    ["cursorBack", cursorBack],
    ["insertLines", insertLines],
  ])("%s returns an empty string for 0, because terminals treat 0 as 1", (_name, build) => {
    expect(build(0)).toBe("");
  });

  it("cursor movement defaults to one cell", () => {
    expect(cursorUp()).toBe(`${ESC}[1A`);
    expect(cursorForward()).toBe(`${ESC}[1C`);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects %s, which would build a malformed sequence",
    (count) => {
      expect(() => cursorUp(count)).toThrow(
        new RangeError(`cursorUp: count must be a non-negative integer, got ${String(count)}`),
      );
    },
  );
});

describe("position sequences", () => {
  it("moveCursor builds CSI row ; column H", () => {
    expect(moveCursor(1, 1)).toBe(`${ESC}[1;1H`);
    expect(moveCursor(10, 42)).toBe(`${ESC}[10;42H`);
  });

  it("changeScrollingRegion builds CSI top ; bottom r", () => {
    expect(changeScrollingRegion(2, 20)).toBe(`${ESC}[2;20r`);
  });

  it("names the invalid parameter", () => {
    expect(() => moveCursor(1, -1)).toThrow("moveCursor: column must be a non-negative integer");
    expect(() => changeScrollingRegion(0.5, 1)).toThrow(
      "changeScrollingRegion: top must be a non-negative integer",
    );
  });
});

describe("clearLines", () => {
  it("clears the current line and the lines above it", () => {
    expect(clearLines(2)).toBe(`${ESC}[2K${ESC}[1A${ESC}[2K${ESC}[1A${ESC}[2K`);
  });

  it("clears only the current line for 0", () => {
    expect(clearLines(0)).toBe(`${ESC}[2K`);
  });
});

describe("fixed sequences", () => {
  it.each([
    [SAVE_CURSOR_POSITION, "s"],
    [RESTORE_CURSOR_POSITION, "u"],
    [HIDE_CURSOR, "?25l"],
    [SHOW_CURSOR, "?25h"],
    [ALT_SCREEN, "?1049h"],
    [EXIT_ALT_SCREEN, "?1049l"],
    [SAVE_SCREEN, "?47h"],
    [RESTORE_SCREEN, "?47l"],
    [ENABLE_MOUSE_PRESS, "?9h"],
    [DISABLE_MOUSE_PRESS, "?9l"],
    [ENABLE_MOUSE, "?1000h"],
    [DISABLE_MOUSE, "?1000l"],
    [ENABLE_MOUSE_HILITE, "?1001h"],
    [DISABLE_MOUSE_HILITE, "?1001l"],
    [ENABLE_MOUSE_CELL_MOTION, "?1002h"],
    [DISABLE_MOUSE_CELL_MOTION, "?1002l"],
    [ENABLE_MOUSE_ALL_MOTION, "?1003h"],
    [DISABLE_MOUSE_ALL_MOTION, "?1003l"],
    [ENABLE_MOUSE_EXTENDED_MODE, "?1006h"],
    [DISABLE_MOUSE_EXTENDED_MODE, "?1006l"],
    [ENABLE_MOUSE_PIXELS_MODE, "?1016h"],
    [DISABLE_MOUSE_PIXELS_MODE, "?1016l"],
    [ENABLE_BRACKETED_PASTE, "?2004h"],
    [DISABLE_BRACKETED_PASTE, "?2004l"],
    [BRACKETED_PASTE_START, "200~"],
    [BRACKETED_PASTE_END, "201~"],
  ])("%j is CSI %s", (sequence, body) => {
    expect(sequence).toBe(`${ESC}[${body}`);
  });
});
