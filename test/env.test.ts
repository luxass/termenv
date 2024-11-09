import { expect, it } from "vitest";
import { getRuntimeConfig } from "../src/env";

it("should return correct config for Node.js environment", () => {
  const mockGlobal = {
    process: {
      env: { NODE_ENV: "test" },
      stdout: { isTTY: true },
      platform: "linux",
      argv: ["node", "script.js"],
    },
  } as any;

  const config = getRuntimeConfig(mockGlobal);

  expect(config.env.NODE_ENV).toBe("test");
  expect(config.isTTY).toBe(true);
  expect(config.platform).toBe("linux");
  expect(config.argv).toEqual(["node", "script.js"]);
  expect(config.runtime).toBe("node");
});

it("should return correct config for Deno environment", () => {
  const mockGlobal = {
    Deno: {
      env: {
        toObject: () => ({ DENO_ENV: "test" }),
      },
      isatty: () => true,
      build: { os: "darwin" },
      args: ["deno", "script.ts"],
    },
  } as any;

  const config = getRuntimeConfig(mockGlobal);

  expect(config.env.DENO_ENV).toBe("test");
  expect(config.isTTY).toBe(true);
  expect(config.platform).toBe("darwin");
  expect(config.argv).toEqual(["deno", "script.ts"]);
  expect(config.runtime).toBe("deno");
});

it("should return correct config for Bun environment", () => {
  const mockGlobal = {
    Bun: {},
    process: {
      env: { BUN_ENV: "test" },
      stdout: { isTTY: false },
      platform: "win32",
      argv: ["bun", "script.js"],
    },
  } as any;

  const config = getRuntimeConfig(mockGlobal);

  expect(config.env.BUN_ENV).toBe("test");
  expect(config.isTTY).toBe(false);
  expect(config.platform).toBe("win32");
  expect(config.argv).toEqual(["bun", "script.js"]);
  expect(config.runtime).toBe("bun");
});

it("should handle missing environment variables gracefully", () => {
  const mockGlobal = {
    process: {
      env: undefined,
      stdout: { isTTY: false },
      platform: "linux",
      argv: ["node", "script.js"],
    },
  } as any;

  const config = getRuntimeConfig(mockGlobal);

  expect(config.env).toEqual({});
  expect(config.isTTY).toBe(false);
  expect(config.platform).toBe("linux");
  expect(config.argv).toEqual(["node", "script.js"]);
  expect(config.runtime).toBe("node");
});
