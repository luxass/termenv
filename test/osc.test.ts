import { describe, expect, it } from "vitest";

import {
  copyToClipboard,
  hyperlink,
  notify,
  RESET_BACKGROUND_COLOR,
  RESET_CURSOR_COLOR,
  RESET_FOREGROUND_COLOR,
  setBackgroundColor,
  setCursorColor,
  setForegroundColor,
  setWindowTitle,
  strip,
} from "../src/utils";

const ESC = "\u001B";
const BEL = "\u0007";
const ST = `${ESC}\\`;

function mockTerminal(env: Record<string, string>) {
  return { process: { env } };
}

describe("hyperlink", () => {
  it("builds an OSC 8 link", () => {
    expect(hyperlink("https://example.com", "example")).toBe(
      `${ESC}]8;;https://example.com${ST}example${ESC}]8;;${ST}`,
    );
  });

  it("uses the url as the text by default", () => {
    expect(hyperlink("https://example.com")).toBe(
      `${ESC}]8;;https://example.com${ST}https://example.com${ESC}]8;;${ST}`,
    );
  });

  it("allows styled text", () => {
    const link = hyperlink("https://example.com", `${ESC}[31mred${ESC}[39m`);
    expect(strip(link)).toBe("red");
  });

  it("strips to the link text", () => {
    expect(strip(hyperlink("https://example.com", "example"))).toBe("example");
  });

  it("rejects a url that could end the sequence", () => {
    expect(() => hyperlink(`https://example.com${ESC}\\evil`, "x")).toThrow(
      new TypeError("hyperlink: url must not contain control characters"),
    );
  });
});

describe("notify", () => {
  it("builds an OSC 777 notification", () => {
    expect(notify("Build", "Done; 3 warnings")).toBe(
      `${ESC}]777;notify;Build;Done; 3 warnings${ST}`,
    );
  });

  it("rejects a title with the ';' separator", () => {
    expect(() => notify("a;b", "body")).toThrow("notify: title must not contain ';'");
  });

  it("rejects control characters in the body", () => {
    expect(() => notify("title", `body${BEL}`)).toThrow(
      "notify: body must not contain control characters",
    );
  });
});

describe("window title and colors", () => {
  it.each([
    ["setWindowTitle", setWindowTitle, "2", "my app"],
    ["setForegroundColor", setForegroundColor, "10", "#ff8800"],
    ["setBackgroundColor", setBackgroundColor, "11", "rgb:00/00/00"],
    ["setCursorColor", setCursorColor, "12", "red"],
  ])("%s builds OSC %s", (_name, build, code, value) => {
    expect(build(value)).toBe(`${ESC}]${code};${value}${BEL}`);
  });

  it("rejects control characters", () => {
    expect(() => setWindowTitle(`title${ESC}[2J`)).toThrow(
      "setWindowTitle: title must not contain control characters",
    );
    expect(() => setForegroundColor("#fff\u009C")).toThrow(
      "setForegroundColor: color must not contain control characters",
    );
  });

  it.each([
    [RESET_FOREGROUND_COLOR, "110"],
    [RESET_BACKGROUND_COLOR, "111"],
    [RESET_CURSOR_COLOR, "112"],
  ])("%j is OSC %s", (sequence, code) => {
    expect(sequence).toBe(`${ESC}]${code}${BEL}`);
  });
});

describe("copyToClipboard", () => {
  it("builds an OSC 52 copy to the system clipboard", () => {
    expect(copyToClipboard("hello", { mockGlobal: mockTerminal({ TERM: "xterm" }) })).toBe(
      `${ESC}]52;c;aGVsbG8=${BEL}`,
    );
  });

  it("copies to the primary selection", () => {
    expect(
      copyToClipboard("hello", { primary: true, mockGlobal: mockTerminal({ TERM: "xterm" }) }),
    ).toBe(`${ESC}]52;p;aGVsbG8=${BEL}`);
  });

  it("encodes text as UTF-8", () => {
    const sequence = copyToClipboard("æøå 🎨", { mockGlobal: mockTerminal({}) });
    const encoded = sequence.slice(`${ESC}]52;c;`.length, -BEL.length);
    expect(new TextDecoder().decode(Uint8Array.from(atob(encoded), (c) => c.codePointAt(0)!))).toBe(
      "æøå 🎨",
    );
  });

  it("wraps the sequence in 76-byte DCS chunks for GNU screen", () => {
    const text = "x".repeat(100);
    const encoded = btoa(text);
    const sequence = copyToClipboard(text, { mockGlobal: mockTerminal({ TERM: "screen" }) });

    expect(sequence).toBe(
      `${ESC}P${ESC}]52;c;${encoded.slice(0, 76)}${ST}${ESC}P${encoded.slice(76)}${BEL}${ST}`,
    );
  });

  it("doesn't wrap for tmux, which also uses TERM=screen*", () => {
    const sequence = copyToClipboard("hello", {
      mockGlobal: mockTerminal({ TERM: "screen-256color", TERM_PROGRAM: "tmux" }),
    });
    expect(sequence).toBe(`${ESC}]52;c;aGVsbG8=${BEL}`);
  });

  it("copies an empty string", () => {
    expect(copyToClipboard("", { mockGlobal: mockTerminal({ TERM: "screen" }) })).toBe(
      `${ESC}P${ESC}]52;c;${BEL}${ST}`,
    );
  });
});
