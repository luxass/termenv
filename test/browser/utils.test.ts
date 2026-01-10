/// <reference types="@vitest/browser-playwright" />

import { describe, expect, it } from "vitest";
import {
  getWindowSize,
  isUnicodeSupported,
  strip,
} from "../../src/utils";

describe("utils browser integration", () => {
  describe("strip function in browser", () => {
    it("should work in browser environment", () => {
      const coloredText = "\u001B[31mHello, World!\u001B[0m";
      expect(strip(coloredText)).toBe("Hello, World!");
    });

    it("should handle Unicode characters properly in browser", () => {
      const unicodeText = "Hello 世界 🌍 \u001B[31mcolored\u001B[0m";
      expect(strip(unicodeText)).toBe("Hello 世界 🌍 colored");
    });

    it("should efficiently process large text in browser", () => {
      const largeText = Array.from({ length: 1000 }, (_, i) =>
        `\u001B[32mLine ${i + 1}:\u001B[0m Content\n`).join("");

      const start = performance.now();
      const result = strip(largeText);
      const end = performance.now();

      expect(result).toContain("Line 1: Content");
      expect(result).not.toContain("\u001B[32m");
      expect(end - start).toBeLessThan(100); // Should be performant
    });
  });

  describe("getWindowSize in browser", () => {
    it("should not throw errors in browser environment", () => {
      expect(() => getWindowSize()).not.toThrow();
      expect(() => getWindowSize({})).not.toThrow();
      expect(() => getWindowSize({ width: 80, height: 24 })).not.toThrow();
    });

    it("should return defaults when no process.stdout exists", () => {
      const size = getWindowSize();
      expect(size).toEqual({ width: 0, height: 0 });
    });

    it("should use fallback values in browser", () => {
      const size = getWindowSize({ width: 80, height: 24 });
      expect(size).toEqual({ width: 80, height: 24 });
    });

    it("should handle browser-like mockGlobal without process", () => {
      const mockBrowser = {
        window: { navigator: { userAgent: "Chrome/91.0" } },
      };

      const size = getWindowSize({
        mockGlobal: mockBrowser,
        width: 120,
        height: 30,
      });

      expect(size).toEqual({ width: 120, height: 30 });
    });
  });

  describe("isUnicodeSupported in browser", () => {
    it("should return false in browser environment by default", () => {
      const supported = isUnicodeSupported();
      expect(supported).toBe(false);
    });

    it("should not throw errors with browser-like global", () => {
      const mockBrowser = {
        window: { chrome: true },
      };

      expect(() => isUnicodeSupported(mockBrowser)).not.toThrow();
      expect(isUnicodeSupported(mockBrowser)).toBe(false);
    });

    it("should work with simulated environments", () => {
      const mockCI = {
        process: {
          platform: "win32",
          env: { CI: "true" },
          stdout: { isTTY: false },
        },
      };

      expect(isUnicodeSupported(mockCI)).toBe(true);
    });
  });

  describe("browser-specific scenarios", () => {
    it("should work in web terminal emulator context", () => {
      // Simulate stripping ANSI from terminal output in browser
      const terminalOutput = "\u001B[32m$ npm test\u001B[0m\n\u001B[33mRunning tests...\u001B[0m\n\u001B[32m✓ All tests passed\u001B[0m";
      const clean = strip(terminalOutput);

      expect(clean).toBe("$ npm test\nRunning tests...\n✓ All tests passed");
    });

    it("should handle log processing in browser apps", () => {
      const logs = [
        "\u001B[90m[DEBUG]\u001B[0m Starting application",
        "\u001B[32m[INFO]\u001B[0m Server listening on port 3000",
        "\u001B[31m[ERROR]\u001B[0m Database connection failed",
      ];

      const cleanLogs = logs.map((log) => strip(log));

      expect(cleanLogs).toEqual([
        "[DEBUG] Starting application",
        "[INFO] Server listening on port 3000",
        "[ERROR] Database connection failed",
      ]);
    });

    it("should work in Progressive Web App context", () => {
      const mockPWA = {
        window: {
          navigator: { standalone: true },
        },
      };

      expect(() => {
        getWindowSize({ mockGlobal: mockPWA, width: 80, height: 24 });
        isUnicodeSupported(mockPWA);
        strip("\u001B[31mPWA text\u001B[0m");
      }).not.toThrow();
    });

    it("should handle browser extension environment", () => {
      const mockExtension = {
        chrome: { runtime: { id: "extension-id" } },
        window: { location: { protocol: "chrome-extension:" } },
      };

      const size = getWindowSize({
        mockGlobal: mockExtension,
        width: 100,
        height: 40,
      });

      expect(size).toEqual({ width: 100, height: 40 });
      expect(isUnicodeSupported(mockExtension)).toBe(false);
    });
  });
});
