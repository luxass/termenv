import type { WindowSize, WindowSizeOptions } from "../src/utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ERASE_LINE,
  ERASE_LINE_LEFT,
  ERASE_LINE_RIGHT,
  ERASE_SCREEN,
  ERASE_SCREEN_LEFT,
  ERASE_SCREEN_RIGHT,
  getWindowSize,
  isUnicodeSupported,
  RESET,
  strip,
} from "../src/utils";

describe("utils", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("constants", () => {
    it("should have correct ANSI escape codes", () => {
      expect(RESET).toBe("\x1B[2J\x1B[0;0H");
      expect(ERASE_SCREEN).toBe("\x1B[2J");
      expect(ERASE_SCREEN_LEFT).toBe("\x1B[1J");
      expect(ERASE_SCREEN_RIGHT).toBe("\x1B[J");
      expect(ERASE_LINE).toBe("\x1B[2K");
      expect(ERASE_LINE_LEFT).toBe("\x1B[1K");
      expect(ERASE_LINE_RIGHT).toBe("\x1B[K");
    });

    it("should have strip function available", () => {
      expect(typeof strip).toBe("function");
    });
  });

  describe("strip", () => {
    const consumptionCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+1234567890-=[]{};':\"./>?,<\\|";

    it("should strip ANSI escape codes from text", () => {
      const coloredText = "\u001B[31mHello, World!\u001B[0m";
      expect(strip(coloredText)).toBe("Hello, World!");
    });

    it("should handle text without ANSI codes", () => {
      const plainText = "Hello, World!";
      expect(strip(plainText)).toBe("Hello, World!");
    });

    it("should handle empty string", () => {
      expect(strip("")).toBe("");
    });

    it("should strip multiple ANSI codes", () => {
      const multiColorText = "\u001B[31m\u001B[1mBold Red\u001B[0m\u001B[32m Green\u001B[0m";
      expect(strip(multiColorText)).toBe("Bold Red Green");
    });

    it("should strip complex ANSI sequences", () => {
      const complexText = "\u001B[38;2;255;0;0mRGB Red\u001B[0m";
      expect(strip(complexText)).toBe("RGB Red");
    });

    it("should handle CSI sequences starting with \u009B", () => {
      const csiText = "\u009B31mRed text\u009B0m";
      expect(strip(csiText)).toBe("Red text");
    });

    it("should handle cursor movement sequences", () => {
      const cursorText = "Start\u001B[2;5HMiddle\u001B[HEnd";
      expect(strip(cursorText)).toBe("StartMiddleEnd");
    });

    it("should handle private mode sequences", () => {
      const privateModeText = "Before\u001B[?1049hSwitched\u001B[?1049lAfter";
      expect(strip(privateModeText)).toBe("BeforeSwitchedAfter");
    });

    it("should handle real-world git diff output", () => {
      const gitOutput = "\u001B[32m+\u001B[0m Added line\n\u001B[31m-\u001B[0m Removed line";
      expect(strip(gitOutput)).toBe("+ Added line\n- Removed line");
    });

    it("should handle npm-style output", () => {
      const npmOutput = "\u001B[33mwarn\u001B[39m deprecated package@1.0.0";
      expect(strip(npmOutput)).toBe("warn deprecated package@1.0.0");
    });

    it("should handle jest test output", () => {
      const jestOutput = " \u001B[32m✓\u001B[39m should pass \u001B[2m(5 ms)\u001B[22m";
      expect(strip(jestOutput)).toBe(" ✓ should pass (5 ms)");
    });

    describe("cSI sequences", () => {
      it.each([
        ["reset", "\u001B[0m", ""],
        ["red color", "\u001B[31m", ""],
        ["bold green", "\u001B[1;32m", ""],
        ["8-bit color", "\u001B[38;5;196m", ""],
        ["24-bit color", "\u001B[38;2;255;0;0m", ""],
        ["clear screen", "\u001B[2J", ""],
        ["cursor home", "\u001B[H", ""],
        ["cursor position", "\u001B[2;5H", ""],
        ["hide cursor", "\u001B[?25l", ""],
        ["show cursor", "\u001B[?25h", ""],
        ["clear line", "\u001B[K", ""],
        ["clear tabs", "\u001B[0g", ""],
        ["reset with semicolon", "\u001B[0;33;49;3;9;4m", ""],
      ])("should strip %s", (_description, input, expected) => {
        expect(strip(input)).toBe(expected);
      });

      it("should not over-consume characters", () => {
        const testCodes = ["\u001B[0m", "\u001B[31m", "\u001B[2J", "\u001B[H"];

        for (const code of testCodes) {
          for (const char of consumptionCharacters) {
            const input = code + char;
            expect(strip(input)).toBe(char);
          }
        }
      });
    });

    describe("oSC sequences", () => {
      const terminators = ["\u0007", "\u001B\u005C", "\u009C"];

      it("should strip window title sequences", () => {
        const input = `\u001B]0;Window Title\u0007`;
        expect(strip(input)).toBe(";Window Title\u0007");
      });

      it.each(terminators)("should strip terminal links with %s terminator", (terminator) => {
        const input = `\u001B]8;k=v;https://example.com${terminator}click\u001B]8;;${terminator}`;
        expect(strip(input)).toBe("click");
      });

      it("should handle OSC sequences with text", () => {
        const input = `Before\u001B]0;title\u0007After`;
        expect(strip(input)).toBe("BeforeAfter");
      });
    });

    it("should handle mixed sequences", () => {
      const mixed = "\u001B[0;33;49;3;9;4mbar\u001B[0m";
      expect(strip(mixed)).toBe("bar");
    });

    it("should preserve text between sequences", () => {
      const input = "foo\u001B[4mcake\u001B[0mbar";
      expect(strip(input)).toBe("foocakebar");
    });

    it("should handle sequences at start and end", () => {
      const input = "\u001B[31mstart\u001B[0m middle \u001B[32mend\u001B[0m";
      expect(strip(input)).toBe("start middle end");
    });
  });

  describe("getWindowSize", () => {
    it("should return process.stdout dimensions when available", () => {
      vi.spyOn(process, "stdout", "get").mockReturnValue({
        ...process.stdout,
        columns: 80,
        rows: 24,
      } as any);

      const size = getWindowSize();
      expect(size).toEqual({ width: 80, height: 24 });
    });

    it("should use fallback when process.stdout dimensions are not available", () => {
      vi.spyOn(process, "stdout", "get").mockReturnValue({
        ...process.stdout,
        // @ts-expect-error testing undefined columns
        columns: undefined,
        // @ts-expect-error testing undefined rows
        rows: undefined,
      });

      const options: WindowSizeOptions = { width: 100, height: 30 };
      const size = getWindowSize(options);
      expect(size).toEqual({ width: 100, height: 30 });
    });

    it("should use default fallback when no options provided", () => {
      vi.spyOn(process, "stdout", "get").mockReturnValue({
        ...process.stdout,
        // @ts-expect-error testing undefined columns
        columns: undefined,
        // @ts-expect-error testing undefined rows
        rows: undefined,
      });

      const size = getWindowSize();
      expect(size).toEqual({ width: 0, height: 0 });
    });

    it("should prefer process.stdout over fallback", () => {
      vi.spyOn(process, "stdout", "get").mockReturnValue({
        ...process.stdout,
        columns: 120,
        rows: 40,
      } as any);

      const options: WindowSizeOptions = { width: 80, height: 24 };
      const size = getWindowSize(options);
      expect(size).toEqual({ width: 120, height: 40 });
    });

    it("should handle partial availability", () => {
      vi.spyOn(process, "stdout", "get").mockReturnValue({
        ...process.stdout,
        columns: 80,
        // @ts-expect-error testing undefined rows
        rows: undefined,
      });

      const options: WindowSizeOptions = { width: 100, height: 30 };
      const size = getWindowSize(options);
      expect(size).toEqual({ width: 80, height: 30 });
    });

    it("should work with mockGlobal", () => {
      const mockGlobal = {
        process: {
          stdout: {
            columns: 120,
            rows: 30,
          },
        },
      };

      const size = getWindowSize({
        mockGlobal,
      });
      expect(size).toEqual({ width: 120, height: 30 });
    });

    it("should handle mockGlobal without process", () => {
      const fallbackSize = {
        width: 80,
        height: 24,
      };
      const size = getWindowSize({
        mockGlobal: {},
        ...fallbackSize,
      });
      expect(size).toEqual(fallbackSize);
    });

    it("should handle mockGlobal with partial process object", () => {
      const mockGlobal = {
        process: {
          stdout: {
            columns: 100,
            // rows missing
          },
        },
      };

      const size = getWindowSize({
        mockGlobal,
        width: 80,
        height: 24,
      });

      expect(size).toEqual({ width: 100, height: 24 });
    });

    it("should handle options with only width", () => {
      vi.spyOn(process, "stdout", "get").mockReturnValue({
        ...process.stdout,
        // @ts-expect-error testing undefined columns
        columns: undefined,
        // @ts-expect-error testing undefined rows
        rows: undefined,
      });

      const options: WindowSizeOptions = { width: 120 };
      const size = getWindowSize(options);
      expect(size).toEqual({ width: 120, height: 0 });
    });

    it("should handle options with only height", () => {
      vi.spyOn(process, "stdout", "get").mockReturnValue({
        ...process.stdout,
        // @ts-expect-error testing undefined columns
        columns: undefined,
        // @ts-expect-error testing undefined rows
        rows: undefined,
      });

      const options: WindowSizeOptions = { height: 50 };
      const size = getWindowSize(options);
      expect(size).toEqual({ width: 0, height: 50 });
    });
  });

  describe("isUnicodeSupported", () => {
    const originalPlatform = process.platform;
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      vi.spyOn(process, "platform", "get").mockReturnValue(originalPlatform);
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should work with mockGlobal parameter", () => {
      const mockGlobal = {
        process: {
          platform: "darwin",
          env: { TERM: "xterm-256color" },
          stdout: { isTTY: true },
        },
      };

      const supported = isUnicodeSupported(mockGlobal);
      expect(supported).toBe(true);
    });

    describe("windows platform", () => {
      beforeEach(() => {
        vi.spyOn(process, "platform", "get").mockReturnValue("win32");
      });

      it("should return true in CI environment", () => {
        process.env.CI = "true";
        expect(isUnicodeSupported()).toBe(true);
      });

      it("should return true in Windows Terminal", () => {
        process.env.WT_SESSION = "1";
        expect(isUnicodeSupported()).toBe(true);
      });

      it("should return true in VS Code", () => {
        process.env.TERM_PROGRAM = "vscode";
        expect(isUnicodeSupported()).toBe(true);
      });

      it("should return true for xterm-256color", () => {
        process.env.TERM = "xterm-256color";
        expect(isUnicodeSupported()).toBe(true);
      });

      it("should return true for alacritty", () => {
        process.env.TERM = "alacritty";
        expect(isUnicodeSupported()).toBe(true);
      });

      it("should return false for basic Windows terminal", () => {
        delete process.env.CI;
        delete process.env.WT_SESSION;
        delete process.env.TERM_PROGRAM;
        delete process.env.TERM;
        expect(isUnicodeSupported()).toBe(false);
      });

      it("should work with mockGlobal on Windows", () => {
        const mockGlobal = {
          process: {
            platform: "win32",
            env: { CI: "true" },
            stdout: { isTTY: false },
          },
        };

        const supported = isUnicodeSupported(mockGlobal);
        expect(supported).toBe(true);
      });
    });

    describe("darwin platform", () => {
      beforeEach(() => {
        vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
      });

      it("should return true on macOS with TTY", () => {
        const mockGlobal = {
          process: {
            platform: "darwin",
            env: {},
            stdout: { isTTY: true },
          },
        };
        expect(isUnicodeSupported(mockGlobal)).toBe(true);
      });

      it("should return false if not TTY", () => {
        const mockGlobal = {
          process: {
            platform: "darwin",
            env: {},
            stdout: { isTTY: false },
          },
        };
        expect(isUnicodeSupported(mockGlobal)).toBe(false);
      });

      it("should return false for dumb terminal", () => {
        const mockGlobal = {
          process: {
            platform: "darwin",
            env: { TERM: "dumb" },
            stdout: { isTTY: true },
          },
        };
        expect(isUnicodeSupported(mockGlobal)).toBe(false);
      });
    });

    describe("linux platform", () => {
      it("should return false if not TTY", () => {
        const mockGlobal = {
          process: {
            platform: "linux",
            env: {},
            stdout: { isTTY: false },
          },
        };
        expect(isUnicodeSupported(mockGlobal)).toBe(false);
      });

      it("should return false for dumb terminal", () => {
        const mockGlobal = {
          process: {
            platform: "linux",
            env: { TERM: "dumb" },
            stdout: { isTTY: true },
          },
        };
        expect(isUnicodeSupported(mockGlobal)).toBe(false);
      });

      it("should return true for supported terminal types", () => {
        const supportedTerms = [
          "xterm",
          "xterm-256color",
          "xterm-color",
          "screen",
          "screen-256color",
          "tmux",
          "tmux-256color",
        ];

        supportedTerms.forEach((term) => {
          const mockGlobal = {
            process: {
              platform: "linux",
              env: { TERM: term },
              stdout: { isTTY: true },
            },
          };
          expect(isUnicodeSupported(mockGlobal)).toBe(true);
        });
      });

      it("should return true for UTF-8 locale", () => {
        const mockGlobal = {
          process: {
            platform: "linux",
            env: { LANG: "en_US.UTF-8" },
            stdout: { isTTY: true },
          },
        };
        expect(isUnicodeSupported(mockGlobal)).toBe(true);
      });

      it("should return false for non-UTF-8 locale", () => {
        const mockGlobal = {
          process: {
            platform: "linux",
            env: { LANG: "en_US.ISO-8859-1" },
            stdout: { isTTY: true },
          },
        };
        expect(isUnicodeSupported(mockGlobal)).toBe(false);
      });

      it("should return false when no indicators present", () => {
        const mockGlobal = {
          process: {
            platform: "linux",
            env: {},
            stdout: { isTTY: true },
          },
        };
        expect(isUnicodeSupported(mockGlobal)).toBe(false);
      });
    });

    describe("browser runtime", () => {
      it("should return false in browser environment", () => {
        const mockGlobal = {
          window: { chrome: true },
          process: {
            env: {},
            stdout: { isTTY: false },
            argv: [],
            platform: undefined,
          },
        };
        expect(isUnicodeSupported(mockGlobal)).toBe(false);
      });
    });

    describe("unknown platform", () => {
      it("should return true for supported terminal on unknown platform", () => {
        const mockGlobal = {
          process: {
            platform: "freebsd",
            env: { TERM: "xterm-256color" },
            stdout: { isTTY: true },
          },
        };
        expect(isUnicodeSupported(mockGlobal)).toBe(true);
      });

      it("should return true for UTF-8 locale on unknown platform", () => {
        const mockGlobal = {
          process: {
            platform: "freebsd",
            env: { LANG: "en_US.UTF-8" },
            stdout: { isTTY: true },
          },
        };
        expect(isUnicodeSupported(mockGlobal)).toBe(true);
      });
    });

    describe("edge cases", () => {
      it("should handle missing environment variables gracefully", () => {
        const mockGlobal = {
          process: {
            platform: "linux",
            env: {},
            stdout: { isTTY: true },
          },
        };
        expect(isUnicodeSupported(mockGlobal)).toBe(false);
      });

      it("should handle empty LANG variable", () => {
        const mockGlobal = {
          process: {
            platform: "linux",
            env: { LANG: "" },
            stdout: { isTTY: true },
          },
        };
        expect(isUnicodeSupported(mockGlobal)).toBe(false);
      });

      it("should handle LANG with UTF-8 substring but not full UTF-8", () => {
        const mockGlobal = {
          process: {
            platform: "linux",
            env: { LANG: "some-UTF-8-variant" },
            stdout: { isTTY: true },
          },
        };
        expect(isUnicodeSupported(mockGlobal)).toBe(true);
      });
    });
  });

  describe("windowSize and WindowSizeOptions interfaces", () => {
    it("should properly type WindowSize", () => {
      const size: WindowSize = { width: 80, height: 24 };
      expect(size.width).toBe(80);
      expect(size.height).toBe(24);
    });

    it("should properly type WindowSizeOptions", () => {
      const options: WindowSizeOptions = {
        width: 120,
        height: 30,
        mockGlobal: globalThis,
      };
      expect(options.width).toBe(120);
      expect(options.height).toBe(30);
      expect(options.mockGlobal).toBe(globalThis);
    });

    it("should allow partial WindowSizeOptions", () => {
      const options1: WindowSizeOptions = { width: 80 };
      const options2: WindowSizeOptions = { height: 24 };
      const options3: WindowSizeOptions = { mockGlobal: globalThis };
      const options4: WindowSizeOptions = {};

      expect(options1.width).toBe(80);
      expect(options2.height).toBe(24);
      expect(options3.mockGlobal).toBe(globalThis);
      expect(options4).toEqual({});
    });
  });
});
