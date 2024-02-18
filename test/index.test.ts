import process from "node:process";

// import tty from "node:tty";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupportedColorMode } from "../src";

// const ORIGINAL_TTY = tty.isatty;

beforeEach(() => {
  Object.defineProperty(process, "platform", {
    value: "linux",
  });
  vi.unstubAllEnvs();
  process.argv = [];
});

describe("get supported color mode", () => {
  it("should return `3` if `FORCE_COLOR` is in env", () => {
    process.stdout.isTTY = false;
    vi.stubEnv("FORCE_COLOR", "1");

    expect(getSupportedColorMode()).toBe(3);
  });

  it("should return true if --color is in argv", () => {
    process.argv.push("--color");
    expect(getSupportedColorMode()).toBe(3);
  });
});
