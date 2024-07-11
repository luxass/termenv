import tty from "node:tty";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { isUnicodeSupported } from "../src/unicode";

vi.mock("tty");

const originalPlatform = process.platform;
const originalEnv = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv };
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  // process.platform = originalPlatform;
  Object.defineProperty(process, "platform", { value: originalPlatform });
  process.env = originalEnv;
});

it("should return true for Windows with supported environment", () => {
  Object.defineProperty(process, "platform", {
    value: "win32",
  });
  vi.stubEnv("WT_SESSION", "1");
  expect(isUnicodeSupported()).toBe(true);
});

it("should return false for Windows without supported environment", () => {
  vi.stubGlobal("process", { ...process, platform: "win32" });
  process.env = {};
  expect(isUnicodeSupported()).toBe(false);
});

it("should return false when not a TTY", () => {
  vi.stubGlobal("process", { ...process, platform: "linux" });
  vi.mocked(tty.isatty).mockReturnValue(false);
  expect(isUnicodeSupported()).toBe(false);
});

it("should return false for dumb terminal", () => {
  vi.stubGlobal("process", { ...process, platform: "linux" });
  vi.mocked(tty.isatty).mockReturnValue(true);
  process.env.TERM = "dumb";
  expect(isUnicodeSupported()).toBe(false);
});

it("should return true for macOS", () => {
  vi.stubGlobal("process", { ...process, platform: "darwin" });
  vi.mocked(tty.isatty).mockReturnValue(true);
  expect(isUnicodeSupported()).toBe(true);
});

it("should return true for supported TERM values", () => {
  vi.stubGlobal("process", { ...process, platform: "linux" });
  vi.mocked(tty.isatty).mockReturnValue(true);
  process.env.TERM = "xterm-256color";
  expect(isUnicodeSupported()).toBe(true);
});

it("should return true when LANG includes UTF-8", () => {
  vi.stubGlobal("process", { ...process, platform: "linux" });
  vi.mocked(tty.isatty).mockReturnValue(true);
  process.env.TERM = "unknown";
  process.env.LANG = "en_US.UTF-8";
  expect(isUnicodeSupported()).toBe(true);
});

it("should return false when no conditions are met", () => {
  vi.stubGlobal("process", { ...process, platform: "linux" });
  vi.mocked(tty.isatty).mockReturnValue(true);
  process.env = {};
  expect(isUnicodeSupported()).toBe(false);
});
