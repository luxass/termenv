import type { WindowSize } from "../src/utils";
import tty from "node:tty";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getWindowSize, isUnicodeSupported, strip } from "../src/utils";

// Mock tty for unicode tests
vi.mock("tty");

const originalPlatform = process.platform;
const originalEnv = process.env;

// Mock stdout for window-size tests
const mockStdout = vi.hoisted(() => ({
  columns: undefined as number | undefined,
  rows: undefined as number | undefined,
}));

const mockProcess = vi.hoisted(() => ({
  stdout: mockStdout,
  platform: process.platform,
  env: process.env,
}));

vi.mock("node:process", () => ({
  default: mockProcess,
}));

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
  mockStdout.columns = undefined;
  mockStdout.rows = undefined;
  mockProcess.env = process.env;
  mockProcess.platform = process.platform;
  vi.clearAllMocks();
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  Object.defineProperty(process, "platform", { value: originalPlatform });
  process.env = originalEnv;
});

describe("strip", () => {
  it("should strip ANSI escape codes from the input string", () => {
    const input = "\x1B[31mHello\x1B[0m, \x1B[32mworld\x1B[0m!";
    const expected = "Hello, world!";
    const result = strip(input);
    expect(result).toEqual(expected);
  });

  it("should handle empty input string", () => {
    const input = "";
    const expected = "";
    const result = strip(input);
    expect(result).toEqual(expected);
  });

  it("should handle input string without any ANSI escape codes", () => {
    const input = "Hello, world!";
    const expected = "Hello, world!";
    const result = strip(input);
    expect(result).toEqual(expected);
  });

  it("should handle input string with multiple ANSI escape codes", () => {
    const input = "\x1B[31mHello\x1B[0m, \x1B[32mworld\x1B[0m! \x1B[33mHow\x1B[0m are \x1B[34myou\x1B[0m?";
    const expected = "Hello, world! How are you?";
    const result = strip(input);
    expect(result).toEqual(expected);
  });
});

describe("isUnicodeSupported", () => {
  it("should return true for Windows with supported environment", () => {
    mockProcess.platform = "win32";
    vi.stubEnv("WT_SESSION", "1");
    expect(isUnicodeSupported()).toBe(true);
  });

  it("should return false for Windows without supported environment", () => {
    mockProcess.platform = "win32";
    mockProcess.env = {};
    expect(isUnicodeSupported()).toBe(false);
  });

  it("should return false when not a TTY", () => {
    mockProcess.platform = "linux";
    vi.mocked(tty.isatty).mockReturnValue(false);
    expect(isUnicodeSupported()).toBe(false);
  });

  it("should return false for dumb terminal", () => {
    mockProcess.platform = "linux";
    vi.mocked(tty.isatty).mockReturnValue(true);
    vi.stubEnv("TERM", "dumb");
    expect(isUnicodeSupported()).toBe(false);
  });

  it("should return true for macOS", () => {
    mockProcess.platform = "darwin";
    vi.mocked(tty.isatty).mockReturnValue(true);
    expect(isUnicodeSupported()).toBe(true);
  });

  it("should return true for supported TERM values", () => {
    mockProcess.platform = "linux";
    vi.mocked(tty.isatty).mockReturnValue(true);
    vi.stubEnv("TERM", "xterm-256color");
    expect(isUnicodeSupported()).toBe(true);
  });

  it("should return true when LANG includes UTF-8", () => {
    mockProcess.platform = "linux";
    vi.mocked(tty.isatty).mockReturnValue(true);
    vi.stubEnv("TERM", "unknown");
    vi.stubEnv("LANG", "en_US.UTF-8");
    expect(isUnicodeSupported()).toBe(true);
  });

  it("should return false when no conditions are met", () => {
    mockProcess.platform = "linux";
    vi.mocked(tty.isatty).mockReturnValue(true);
    mockProcess.env = {};
    expect(isUnicodeSupported()).toBe(false);
  });
});

describe("getWindowSize", () => {
  describe("when process.stdout values are available", () => {
    it("should return the correct window size", () => {
      mockStdout.columns = 100;
      mockStdout.rows = 50;

      const result = getWindowSize();
      expect(result).toEqual({ width: 100, height: 50 });
    });
  });

  describe("when process.stdout values are undefined", () => {
    it("should use fallback values if provided", () => {
      const fallback: WindowSize = { width: 80, height: 24 };
      const result = getWindowSize(fallback);
      expect(result).toEqual(fallback);
    });

    it("should use 0 as default when no fallback is provided", () => {
      const result = getWindowSize();
      expect(result).toEqual({ width: 0, height: 0 });
    });
  });

  describe("when both process.stdout and fallback values are available", () => {
    it("should prefer process.stdout values over fallback", () => {
      mockStdout.columns = 120;
      mockStdout.rows = 60;

      const fallback: WindowSize = { width: 80, height: 24 };
      const result = getWindowSize(fallback);
      expect(result).toEqual({ width: 120, height: 60 });
    });
  });

  describe("when handling mixed cases", () => {
    it("should use available process.stdout value and fallback for undefined", () => {
      mockStdout.columns = 100;
      // rows is left as undefined

      const fallback: WindowSize = { width: 80, height: 24 };
      const result = getWindowSize(fallback);
      expect(result).toEqual({ width: 100, height: 24 });
    });
  });
});
