import tty from "node:tty";
import { afterAll, beforeEach, expect, it, vi } from "vitest";
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
  Object.defineProperty(process, "platform", {
    value: "win32",
  });
  process.env = {};
  expect(isUnicodeSupported()).toBe(false);
});

it("should return false when not a TTY", () => {
  Object.defineProperty(process, "platform", {
    value: "linux",
  });
  vi.mocked(tty.isatty).mockReturnValue(false);
  expect(isUnicodeSupported()).toBe(false);
});

it("should return false for dumb terminal", () => {
  Object.defineProperty(process, "platform", {
    value: "linux",
  });
  vi.mocked(tty.isatty).mockReturnValue(true);
  vi.stubEnv("TERM", "dumb");
  expect(isUnicodeSupported()).toBe(false);
});

it("should return true for macOS", () => {
  Object.defineProperty(process, "platform", {
    value: "darwin",
  });
  vi.mocked(tty.isatty).mockReturnValue(true);
  expect(isUnicodeSupported()).toBe(true);
});

it("should return true for supported TERM values", () => {
  Object.defineProperty(process, "platform", {
    value: "linux",
  });
  vi.mocked(tty.isatty).mockReturnValue(true);
  vi.stubEnv("TERM", "xterm-256color");
  expect(isUnicodeSupported()).toBe(true);
});

it("should return true when LANG includes UTF-8", () => {
  Object.defineProperty(process, "platform", {
    value: "linux",
  });
  vi.mocked(tty.isatty).mockReturnValue(true);
  vi.stubEnv("TERM", "unknown");
  vi.stubEnv("LANG", "en_US.UTF-8");
  expect(isUnicodeSupported()).toBe(true);
});

it("should return false when no conditions are met", () => {
  Object.defineProperty(process, "platform", {
    value: "linux",
  });
  vi.mocked(tty.isatty).mockReturnValue(true);
  process.env = {};
  expect(isUnicodeSupported()).toBe(false);
});
