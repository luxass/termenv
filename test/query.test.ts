import { describe, expect, it } from "vitest";

import type { TerminalInput, TerminalOutput } from "../src/utils";
import { hasDarkBackground, queryBackgroundColor, queryForegroundColor } from "../src/utils";

const ESC = "\u001B";
const BEL = "\u0007";
const CURSOR_POSITION_ANSWER = `${ESC}[12;1R`;

/**
 * A fake TTY pair. When the query is written, the terminal answers with the chunks from `answer`.
 * An empty array means the terminal doesn't answer.
 */
function fakeTerminal(answer: (query: string) => string[]) {
  const listeners = new Set<(chunk: Uint8Array | string) => void>();
  const rawModes: boolean[] = [];
  const written: string[] = [];
  let pauseCount = 0;

  const input: TerminalInput & { isRaw: boolean } = {
    isTTY: true,
    isRaw: false,
    readableFlowing: null,
    setRawMode(mode) {
      rawModes.push(mode);
      input.isRaw = mode;
    },
    // Like a Node.js Readable: a data listener starts the flow only if the stream was never paused.
    on(_event, listener) {
      listeners.add(listener);
      if (input.readableFlowing === null) input.readableFlowing = true;
    },
    off(_event, listener) {
      listeners.delete(listener);
    },
    pause() {
      pauseCount += 1;
      input.readableFlowing = false;
    },
    resume() {
      input.readableFlowing = true;
    },
  };

  const output: TerminalOutput = {
    isTTY: true,
    write(data) {
      written.push(data);
      const chunks = answer(data);
      queueMicrotask(() => {
        // A paused stream doesn't emit data, so the answer is lost.
        if (input.readableFlowing !== true) return;
        for (const chunk of chunks) {
          for (const listener of listeners) listener(new TextEncoder().encode(chunk));
        }
      });
    },
  };

  return {
    input,
    output,
    written,
    rawModes,
    listenerCount: () => listeners.size,
    pauseCount: () => pauseCount,
  };
}

const mockGlobal = { process: { env: { TERM: "xterm-256color" } } };

describe("queryBackgroundColor", () => {
  it("reads an OSC 11 answer terminated by ST", async () => {
    const terminal = fakeTerminal(() => [
      `${ESC}]11;rgb:1e1e/1e1e/2e2e${ESC}\\`,
      CURSOR_POSITION_ANSWER,
    ]);

    await expect(queryBackgroundColor({ ...terminal, mockGlobal })).resolves.toEqual({
      red: 30,
      green: 30,
      blue: 46,
    });
    expect(terminal.written).toEqual([`${ESC}]11;?${ESC}\\${ESC}[6n`]);
  });

  it("reads an answer terminated by BEL and split across chunks", async () => {
    const terminal = fakeTerminal(() => [`${ESC}]11;rgb:ff`, `ff/ffff/ffff${BEL}${ESC}[1`, ";1R"]);

    await expect(queryBackgroundColor({ ...terminal, mockGlobal })).resolves.toEqual({
      red: 255,
      green: 255,
      blue: 255,
    });
  });

  it.each([
    ["rgb:f/8/0", { red: 255, green: 136, blue: 0 }],
    ["rgb:ff/88/00", { red: 255, green: 136, blue: 0 }],
    ["rgb:fff/888/000", { red: 255, green: 136, blue: 0 }],
    ["rgba:ffff/8888/0000/ffff", { red: 255, green: 136, blue: 0 }],
  ])("parses the X11 color %s", async (value, expected) => {
    const terminal = fakeTerminal(() => [`${ESC}]11;${value}${BEL}`, CURSOR_POSITION_ANSWER]);
    await expect(queryBackgroundColor({ ...terminal, mockGlobal })).resolves.toEqual(expected);
  });

  it("restores raw mode, removes its listener, and pauses input", async () => {
    const terminal = fakeTerminal(() => [`${ESC}]11;rgb:0/0/0${BEL}`, CURSOR_POSITION_ANSWER]);

    await queryBackgroundColor({ ...terminal, mockGlobal });

    expect(terminal.rawModes).toEqual([true, false]);
    expect(terminal.listenerCount()).toBe(0);
    expect(terminal.pauseCount()).toBe(1);
  });

  it("keeps raw mode and a flowing stream as the caller left them", async () => {
    const terminal = fakeTerminal(() => [`${ESC}]11;rgb:0/0/0${BEL}`, CURSOR_POSITION_ANSWER]);
    terminal.input.isRaw = true;
    terminal.input.readableFlowing = true;

    await queryBackgroundColor({ ...terminal, mockGlobal });

    expect(terminal.rawModes).toEqual([true, true]);
    expect(terminal.pauseCount()).toBe(0);
  });

  it("resolves to undefined at once when only the cursor position is answered", async () => {
    const terminal = fakeTerminal(() => [CURSOR_POSITION_ANSWER]);
    const started = Date.now();

    await expect(
      queryBackgroundColor({ ...terminal, mockGlobal, timeout: 5000 }),
    ).resolves.toBeUndefined();
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("resolves to undefined after the timeout when nothing answers", async () => {
    const terminal = fakeTerminal(() => []);

    await expect(
      queryBackgroundColor({ ...terminal, mockGlobal, timeout: 20 }),
    ).resolves.toBeUndefined();
    expect(terminal.listenerCount()).toBe(0);
    expect(terminal.rawModes).toEqual([true, false]);
  });

  it("ignores an answer to a different color query", async () => {
    const terminal = fakeTerminal(() => [`${ESC}]10;rgb:ff/ff/ff${BEL}`, CURSOR_POSITION_ANSWER]);
    await expect(queryBackgroundColor({ ...terminal, mockGlobal })).resolves.toBeUndefined();
  });

  it("ignores a color answer that arrives after the cursor position answer", async () => {
    // Terminals answer in order, so a color answer after the cursor position belongs to something else.
    const terminal = fakeTerminal(() => [`${CURSOR_POSITION_ANSWER}${ESC}]11;rgb:ff/ff/ff${BEL}`]);
    await expect(queryBackgroundColor({ ...terminal, mockGlobal })).resolves.toBeUndefined();
  });

  it("keeps waiting for the cursor position answer after its own color answer", async () => {
    // Without the cursor position answer, the query can't know that the color answer is meant for it.
    // A query that finished on the color answer alone would also leave the late cursor answer unread,
    // so it would show up as garbage in the user's terminal.
    const terminal = fakeTerminal(() => [`${ESC}]11;rgb:ff/ff/ff${BEL}`]);

    await expect(
      queryBackgroundColor({ ...terminal, mockGlobal, timeout: 50 }),
    ).resolves.toBeUndefined();
  });

  it("stops reading when the input is too long to be an answer", async () => {
    const terminal = fakeTerminal(() => ["x".repeat(1100)]);
    const started = Date.now();

    await expect(
      queryBackgroundColor({ ...terminal, mockGlobal, timeout: 4000 }),
    ).resolves.toBeUndefined();
    // Without the length limit, the query would wait for its 4 second timeout.
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it.each(["screen-256color", "tmux-256color", "dumb"])(
    "doesn't query when TERM=%s",
    async (term) => {
      const terminal = fakeTerminal(() => [`${ESC}]11;rgb:0/0/0${BEL}`, CURSOR_POSITION_ANSWER]);

      await expect(
        queryBackgroundColor({ ...terminal, mockGlobal: { process: { env: { TERM: term } } } }),
      ).resolves.toBeUndefined();
      expect(terminal.written).toEqual([]);
    },
  );

  it("doesn't query when the input isn't a TTY", async () => {
    const terminal = fakeTerminal(() => [`${ESC}]11;rgb:0/0/0${BEL}`, CURSOR_POSITION_ANSWER]);
    terminal.input.isTTY = false;

    await expect(queryBackgroundColor({ ...terminal, mockGlobal })).resolves.toBeUndefined();
    expect(terminal.written).toEqual([]);
  });

  it.each([
    ["15;0", { red: 0, green: 0, blue: 0 }],
    ["0;15", { red: 255, green: 255, blue: 255 }],
    ["15;default;4", { red: 0, green: 0, blue: 128 }],
    ["0;196", { red: 255, green: 0, blue: 0 }],
    ["0;244", { red: 128, green: 128, blue: 128 }],
  ])("falls back to COLORFGBG=%s", async (colorFgBg, expected) => {
    const terminal = fakeTerminal(() => [CURSOR_POSITION_ANSWER]);

    await expect(
      queryBackgroundColor({
        ...terminal,
        mockGlobal: { process: { env: { TERM: "xterm", COLORFGBG: colorFgBg } } },
      }),
    ).resolves.toEqual(expected);
  });

  it.each(["", "15", "15;x", "15;256"])("ignores an invalid COLORFGBG=%j", async (colorFgBg) => {
    const terminal = fakeTerminal(() => [CURSOR_POSITION_ANSWER]);

    await expect(
      queryBackgroundColor({
        ...terminal,
        mockGlobal: { process: { env: { TERM: "xterm", COLORFGBG: colorFgBg } } },
      }),
    ).resolves.toBeUndefined();
  });
});

describe("queryForegroundColor", () => {
  it("sends OSC 10 and reads the answer", async () => {
    const terminal = fakeTerminal(() => [
      `${ESC}]10;rgb:cdcd/d6d6/f4f4${BEL}`,
      CURSOR_POSITION_ANSWER,
    ]);

    await expect(queryForegroundColor({ ...terminal, mockGlobal })).resolves.toEqual({
      red: 205,
      green: 214,
      blue: 244,
    });
    expect(terminal.written).toEqual([`${ESC}]10;?${ESC}\\${ESC}[6n`]);
  });

  it("falls back to the first COLORFGBG field", async () => {
    const terminal = fakeTerminal(() => [CURSOR_POSITION_ANSWER]);

    await expect(
      queryForegroundColor({
        ...terminal,
        mockGlobal: { process: { env: { TERM: "xterm", COLORFGBG: "7;0" } } },
      }),
    ).resolves.toEqual({ red: 192, green: 192, blue: 192 });
  });
});

describe("sequential queries", () => {
  it("resumes input that the previous query paused", async () => {
    const terminal = fakeTerminal(() => [`${ESC}]11;rgb:0/0/0${BEL}`, CURSOR_POSITION_ANSWER]);

    await queryBackgroundColor({ ...terminal, mockGlobal });
    await expect(queryBackgroundColor({ ...terminal, mockGlobal, timeout: 50 })).resolves.toEqual({
      red: 0,
      green: 0,
      blue: 0,
    });
  });
});

describe("concurrent queries", () => {
  it("runs one query at a time on the shared input", async () => {
    const terminal = fakeTerminal((query) => {
      const code = query.slice(2, 4);
      const value = code === "10" ? "rgb:ff/ff/ff" : "rgb:00/00/00";
      return [`${ESC}]${code};${value}${BEL}`, CURSOR_POSITION_ANSWER];
    });

    const [foreground, background] = await Promise.all([
      queryForegroundColor({ ...terminal, mockGlobal }),
      queryBackgroundColor({ ...terminal, mockGlobal }),
    ]);

    expect(foreground).toEqual({ red: 255, green: 255, blue: 255 });
    expect(background).toEqual({ red: 0, green: 0, blue: 0 });
    expect(terminal.written).toHaveLength(2);
  });
});

describe("hasDarkBackground", () => {
  it.each([
    ["rgb:1e/1e/2e", true],
    ["rgb:ff/ff/ff", false],
    ["rgb:80/80/80", false],
    ["rgb:7f/7f/7f", true],
  ])("uses the HSL lightness of %s", async (value, expected) => {
    const terminal = fakeTerminal(() => [`${ESC}]11;${value}${BEL}`, CURSOR_POSITION_ANSWER]);
    await expect(hasDarkBackground({ ...terminal, mockGlobal })).resolves.toBe(expected);
  });

  it("assumes a dark background when the color is unknown", async () => {
    const terminal = fakeTerminal(() => [CURSOR_POSITION_ANSWER]);
    await expect(hasDarkBackground({ ...terminal, mockGlobal })).resolves.toBe(true);
  });
});
