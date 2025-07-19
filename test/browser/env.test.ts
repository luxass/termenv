/// <reference types="@vitest/browser/providers/playwright" />

import { describe, expect, it } from "vitest";

import { getTerminalEnvironment } from "../../src/env";

describe("env", () => {
  it("should return the correct terminal environment", async () => {
    const environment = getTerminalEnvironment();

    expect(environment).toBeDefined();
    expect(environment.argv).toBeDefined();
    expect(environment.isTTY).toBeDefined();
    expect(environment.platform).not.toBeDefined();
    expect(environment.runtime).toBeDefined();
  });

  it("should detect browser runtime", () => {
    const environment = getTerminalEnvironment();
    expect(environment.runtime).toBe("browser");
  });

  it("should have empty argv in browser", () => {
    const environment = getTerminalEnvironment();
    expect(environment.argv).toEqual([]);
  });

  it("should have isTTY false in browser", () => {
    const environment = getTerminalEnvironment();
    expect(environment.isTTY).toBe(false);
  });

  it("should have empty env object in browser", () => {
    const environment = getTerminalEnvironment();
    expect(environment.env).toEqual({});
  });

  it("should have undefined platform in browser", () => {
    const environment = getTerminalEnvironment();
    expect(environment.platform).toBeUndefined();
  });

  it("should work with mock global object", () => {
    const mockGlobal = {
      window: { chrome: true },
      process: {
        env: { TEST_VAR: "test_value" },
        argv: ["node", "script.js"],
        platform: "linux",
        stdout: { isTTY: true }
      }
    };

    const environment = getTerminalEnvironment(mockGlobal);
    expect(environment.runtime).toBe("browser");
    expect(environment.env).toEqual({ TEST_VAR: "test_value" });
    expect(environment.argv).toEqual(["node", "script.js"]);
    expect(environment.platform).toBe("linux");
    expect(environment.isTTY).toBe(true);
  });

  it("should prioritize browser detection over Node.js when window.chrome exists", () => {
    const mockGlobal = {
      window: { chrome: true },
      process: {
        versions: { node: "18.0.0" },
        env: {},
        argv: [],
        platform: "darwin"
      }
    };

    const environment = getTerminalEnvironment(mockGlobal);
    expect(environment.runtime).toBe("browser");
  });

  it("should handle missing process object gracefully", () => {
    const mockGlobal = {
      window: { chrome: true }
    };

    const environment = getTerminalEnvironment(mockGlobal);
    expect(environment.runtime).toBe("browser");
    expect(environment.env).toEqual({});
    expect(environment.argv).toEqual([]);
    expect(environment.platform).toBeUndefined();
    expect(environment.isTTY).toBe(false);
  });

  it("should detect unknown runtime when no identifiers are present", () => {
    const mockGlobal = {};

    const environment = getTerminalEnvironment(mockGlobal);
    expect(environment.runtime).toBe("unknown");
  });
});
