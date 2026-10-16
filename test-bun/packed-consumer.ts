import assert from "node:assert/strict";

import { getColorSpace, getTerminalEnvironment, SPACE_MONO } from "termenv";
import { getColorSpaceByRuntime } from "termenv/supports";
import { getWindowSize, strip } from "termenv/utils";

// CI copies this file into an isolated project that installs the packed npm package.
// Package imports must resolve from that project, not from this repository.
assert.equal(getTerminalEnvironment().runtime, "bun");
assert.equal(strip("\u001B[31mHello\u001B[0m"), "Hello");
assert.deepEqual(getWindowSize({ mockGlobal: {}, width: 80, height: 24 }), {
  width: 80,
  height: 24,
});

const mockGlobal = { process: { env: { NO_COLOR: "1" } } };
assert.equal(getColorSpace(mockGlobal), SPACE_MONO);
assert.equal(getColorSpaceByRuntime(getTerminalEnvironment(mockGlobal)), SPACE_MONO);
