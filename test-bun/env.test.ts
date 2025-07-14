import { expect, test } from "bun:test";
import { getRuntimeConfig } from "../src/env.ts";

test("should detect Bun runtime", () => {
  const config = getRuntimeConfig();

  expect(config.runtime).toBe("bun");
  expect(typeof config.env).toBe("object");
  expect(typeof config.isTTY).toBe("boolean");
  expect(typeof config.platform).toBe("string");
  expect(Array.isArray(config.argv)).toBe(true);
});

test("should use Bun-specific properties", () => {
  const config = getRuntimeConfig();

  expect(config.runtime).toBe("bun");
  expect(config.platform).toBe(process.platform);
  expect(config.argv.length >= 2).toBe(true);
});

test("should handle mock Node.js environment", () => {
  const mockGlobal = {
    process: {
      env: { NODE_ENV: "test" },
      stdout: { isTTY: true },
      platform: "linux",
      argv: ["node", "script.js"],
      versions: { node: "18.0.0" },
    },
  };

  const config = getRuntimeConfig(mockGlobal);

  expect(config.env.NODE_ENV).toBe("test");
  expect(config.isTTY).toBe(true);
  expect(config.platform).toBe("linux");
  expect(config.argv).toEqual(["node", "script.js"]);
  expect(config.runtime).toBe("node");
});

test("should handle mock Bun environment", () => {
  const mockGlobal = {
    Bun: {},
    process: {
      env: { BUN_ENV: "test" },
      stdout: { isTTY: false },
      platform: "win32",
      argv: ["bun", "run", "script.js"],
    },
  };

  const config = getRuntimeConfig(mockGlobal);

  expect(config.env.BUN_ENV).toBe("test");
  expect(config.isTTY).toBe(false);
  expect(config.platform).toBe("win32");
  expect(config.argv).toEqual(["bun", "run", "script.js"]);
  expect(config.runtime).toBe("bun");
});

test("should handle mock browser environment", () => {
  const mockGlobal = {
    window: { chrome: {} },
    process: {
      env: {},
      stdout: {},
      platform: undefined,
      argv: [],
    },
  };

  const config = getRuntimeConfig(mockGlobal);

  expect(config.env).toEqual({});
  expect(config.isTTY).toBe(false);
  expect(config.platform).toBe(undefined);
  expect(config.argv).toEqual([]);
  expect(config.runtime).toBe("browser");
});

test("should handle mock Deno environment", () => {
  const mockGlobal = {
    Deno: {
      isatty: () => true,
      build: { os: "darwin" },
      args: ["deno", "run", "script.ts"],
    },
    process: {
      env: { DENO_ENV: "test" },
      stdout: { isTTY: true },
      platform: "darwin",
      argv: ["deno", "run", "script.ts"],
    },
  };

  const config = getRuntimeConfig(mockGlobal);

  expect(config.runtime).toBe("deno");
  expect(config.env.DENO_ENV).toBe("test");
  expect(config.isTTY).toBe(true);
  expect(config.platform).toBe("darwin");
  expect(config.argv).toEqual(["deno", "run", "script.ts"]);
});

test("should handle environment variable access", () => {
  const config = getRuntimeConfig();

  expect(config.runtime).toBe("bun");
  expect(typeof config.env).toBe("object");
});