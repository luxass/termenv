import { expect, it } from "vitest";
import { getTerminalEnvironment } from "../src/env";

it("should return correct config for Node.js environment", () => {
  const mockGlobal = {
    process: {
      env: { NODE_ENV: "test" },
      stdout: { isTTY: true },
      platform: "linux",
      argv: ["node", "script.js"],
      versions: {
        node: "24.3.0",
      },
    },
  };

  const config = getTerminalEnvironment(mockGlobal);

  expect(config.env.NODE_ENV).toBe("test");
  expect(config.isTTY).toBe(true);
  expect(config.platform).toBe("linux");
  expect(config.argv).toEqual(["node", "script.js"]);
  expect(config.runtime).toBe("node");
});

it("should handle missing environment variables gracefully", () => {
  const mockGlobal = {
    process: {
      env: undefined,
      stdout: { isTTY: false },
      platform: "linux",
      argv: ["node", "script.js"],
      versions: {
        node: "24.3.0",
      },
    },
  };

  const config = getTerminalEnvironment(mockGlobal);

  expect(config.env).toEqual({});
  expect(config.isTTY).toBe(false);
  expect(config.platform).toBe("linux");
  expect(config.argv).toEqual(["node", "script.js"]);
  expect(config.runtime).toBe("node");
});
