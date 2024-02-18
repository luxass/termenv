import process from "node:process";

// import tty from "node:tty";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupportedLevel } from "../src";

// const ORIGINAL_TTY = tty.isatty;

beforeEach(() => {
  Object.defineProperty(process, "platform", {
    value: "linux",
  });
  vi.unstubAllEnvs();
  process.argv = [];
});

describe("get supported color mode", () => {
  it("should return `0` if NO_COLOR is in env", () => {
    vi.stubEnv("NO_COLOR", "1");
    expect(getSupportedLevel()).toBe(0);
  });

  it("should return `0` if --no-color is in argv", () => {
    process.argv.push("--no-color");
    expect(getSupportedLevel()).toBe(0);
  });

  it("should return `3` if FORCE_COLOR is in env", () => {
    vi.stubEnv("FORCE_COLOR", "1");
    expect(getSupportedLevel()).toBe(3);
  });

  it("should return `3` if --color is in argv", () => {
    process.argv.push("--color");
    expect(getSupportedLevel()).toBe(3);
  });
});
