import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WindowSize } from "../src/window-size";
import { getWindowSize } from "../src/window-size";

const mockStdout = vi.hoisted(() => ({
  columns: undefined as number | undefined,
  rows: undefined as number | undefined,
}));

vi.mock("node:process", () => ({
  default: {
    stdout: mockStdout,
  },
}));

beforeEach(() => {
  mockStdout.columns = undefined;
  mockStdout.rows = undefined;
  vi.clearAllMocks();
});

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
