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
});
