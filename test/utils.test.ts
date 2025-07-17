/* eslint-disable ts/no-require-imports */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANSI_REGEX,
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

    it("should have a valid ANSI regex pattern", () => {
      expect(ANSI_REGEX).toBeInstanceOf(RegExp);
      expect(ANSI_REGEX.global).toBe(true);
    });
  });

  describe("strip", () => {
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
  });

  describe("getWindowSize", () => {
    it("should return process.stdout dimensions when available", () => {
      Object.defineProperty(process.stdout, "columns", {
        value: 80,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "rows", {
        value: 24,
        configurable: true,
      });

      const size = getWindowSize();
      expect(size).toEqual({ width: 80, height: 24 });
    });

    it("should use fallback when process.stdout dimensions are not available", () => {
      Object.defineProperty(process.stdout, "columns", {
        value: undefined,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "rows", {
        value: undefined,
        configurable: true,
      });

      const fallback = { width: 100, height: 30 };
      const size = getWindowSize(fallback);
      expect(size).toEqual(fallback);
    });

    it("should use default fallback when no fallback provided", () => {
      Object.defineProperty(process.stdout, "columns", {
        value: undefined,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "rows", {
        value: undefined,
        configurable: true,
      });

      const size = getWindowSize();
      expect(size).toEqual({ width: 0, height: 0 });
    });

    it("should prefer process.stdout over fallback", () => {
      Object.defineProperty(process.stdout, "columns", {
        value: 120,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "rows", {
        value: 40,
        configurable: true,
      });

      const fallback = { width: 80, height: 24 };
      const size = getWindowSize(fallback);
      expect(size).toEqual({ width: 120, height: 40 });
    });

    it("should handle partial availability", () => {
      Object.defineProperty(process.stdout, "columns", {
        value: 80,
        configurable: true,
      });
      Object.defineProperty(process.stdout, "rows", {
        value: undefined,
        configurable: true,
      });

      const fallback = { width: 100, height: 30 };
      const size = getWindowSize(fallback);
      expect(size).toEqual({ width: 80, height: 30 });
    });
  });

  describe("isUnicodeSupported", () => {
    const originalPlatform = process.platform;
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      Object.defineProperty(process, "platform", {
        value: originalPlatform,
        writable: true,
      });
    });

    afterEach(() => {
      process.env = originalEnv;
      Object.defineProperty(process, "platform", {
        value: originalPlatform,
        writable: true,
      });
    });

    describe("windows platform", () => {
      beforeEach(() => {
        Object.defineProperty(process, "platform", {
          value: "win32",
          writable: true,
        });
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
    });

    describe("darwin platform", () => {
      beforeEach(() => {
        Object.defineProperty(process, "platform", {
          value: "darwin",
          writable: true,
        });
        vi.spyOn(require("node:tty"), "isatty").mockReturnValue(true);
      });

      it("should return true on macOS", () => {
        expect(isUnicodeSupported()).toBe(true);
      });

      it("should return false if not TTY", () => {
        vi.spyOn(require("node:tty"), "isatty").mockReturnValue(false);
        expect(isUnicodeSupported()).toBe(false);
      });

      it("should return false for dumb terminal", () => {
        process.env.TERM = "dumb";
        expect(isUnicodeSupported()).toBe(false);
      });
    });

    describe("linux platform", () => {
      beforeEach(() => {
        Object.defineProperty(process, "platform", {
          value: "linux",
          writable: true,
        });
        vi.spyOn(require("node:tty"), "isatty").mockReturnValue(true);
      });

      it("should return false if not TTY", () => {
        vi.spyOn(require("node:tty"), "isatty").mockReturnValue(false);
        expect(isUnicodeSupported()).toBe(false);
      });

      it("should return false for dumb terminal", () => {
        process.env.TERM = "dumb";
        expect(isUnicodeSupported()).toBe(false);
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
          process.env.TERM = term;
          expect(isUnicodeSupported()).toBe(true);
        });
      });

      it("should return true for UTF-8 locale", () => {
        delete process.env.TERM;
        process.env.LANG = "en_US.UTF-8";
        expect(isUnicodeSupported()).toBe(true);
      });

      it("should return false for non-UTF-8 locale", () => {
        delete process.env.TERM;
        process.env.LANG = "en_US.ISO-8859-1";
        expect(isUnicodeSupported()).toBe(false);
      });

      it("should return false when no indicators present", () => {
        delete process.env.TERM;
        delete process.env.LANG;
        expect(isUnicodeSupported()).toBe(false);
      });
    });
  });
});
