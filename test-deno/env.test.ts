/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import { getTerminalEnvironment } from "../src/env.ts";

Deno.test("should detect Deno runtime", () => {
  const config = getTerminalEnvironment();

  assertEquals(config.runtime, "deno");
  assertEquals(typeof config.env, "object");
  assertEquals(typeof config.isTTY, "boolean");
  assertEquals(typeof config.platform, "string");
  assertEquals(Array.isArray(config.argv), true);
});

Deno.test("should use Deno-specific properties", () => {
  const config = getTerminalEnvironment();

  assertEquals(config.runtime, "deno");
  assertEquals(config.platform, Deno.build.os);
  assertEquals(config.argv.length >= 2, true);
});

Deno.test("should handle mock Node.js environment", () => {
  const mockGlobal = {
    process: {
      env: { NODE_ENV: "test" },
      stdout: { isTTY: true },
      platform: "linux",
      argv: ["node", "script.js"],
      versions: { node: "18.0.0" },
    },
  };

  const config = getTerminalEnvironment(mockGlobal);

  assertEquals(config.env.NODE_ENV, "test");
  assertEquals(config.isTTY, true);
  assertEquals(config.platform, "linux");
  assertEquals(config.argv, ["node", "script.js"]);
  assertEquals(config.runtime, "node");
});

Deno.test("should handle mock Bun environment", () => {
  const mockGlobal = {
    Bun: {},
    process: {
      env: { BUN_ENV: "test" },
      stdout: { isTTY: false },
      platform: "win32",
      argv: ["bun", "run", "script.js"],
    },
  };

  const config = getTerminalEnvironment(mockGlobal);

  assertEquals(config.env.BUN_ENV, "test");
  assertEquals(config.isTTY, false);
  assertEquals(config.platform, "win32");
  assertEquals(config.argv, ["bun", "run", "script.js"]);
  assertEquals(config.runtime, "bun");
});

Deno.test("should handle mock browser environment", () => {
  const mockGlobal = {
    window: { chrome: {} },
    process: {
      env: {},
      stdout: {},
      platform: undefined,
      argv: [],
    },
  };

  const config = getTerminalEnvironment(mockGlobal);

  assertEquals(config.env, {});
  assertEquals(config.isTTY, false);
  assertEquals(config.platform, undefined);
  assertEquals(config.argv, []);
  assertEquals(config.runtime, "browser");
});

Deno.test("should handle mock Deno environment", () => {
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

  const config = getTerminalEnvironment(mockGlobal);

  assertEquals(config.runtime, "deno");
  assertEquals(config.env.DENO_ENV, "test");
  assertEquals(config.isTTY, true);
  assertEquals(config.platform, "darwin");
  assertEquals(config.argv, ["deno", "run", "script.ts"]);
});

Deno.test("should handle environment variable access", () => {
  const originalEnv = Deno.env.get;
  const envStub = stub(Deno.env, "get", (key: string) => {
    if (key === "TEST_VAR") return "test_value";
    return originalEnv.call(Deno.env, key);
  });

  try {
    const config = getTerminalEnvironment();

    assertEquals(config.runtime, "deno");
    assertEquals(typeof config.env, "object");
  } finally {
    envStub.restore();
  }
});
