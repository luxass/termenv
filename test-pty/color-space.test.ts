import { describe, expect, setDefaultTimeout, test } from "bun:test";

import { SPACE_256_COLORS, SPACE_MONO, SPACE_TRUE_COLORS } from "../src/supports";
import {
  fixture,
  getRuntimes,
  isPtySupported,
  resultOf,
  runInTerminal,
  runWithPipe,
  TEST_TIMEOUT,
} from "./harness";

setDefaultTimeout(TEST_TIMEOUT);

for (const runtime of getRuntimes()) {
  const colorSpace = [...runtime.command, fixture("color-space.mjs")];

  describe.skipIf(!isPtySupported)(`color detection in a real terminal (${runtime.name})`, () => {
    test.each([
      ["TERM=xterm-256color", { TERM: "xterm-256color" }, SPACE_256_COLORS],
      [
        "COLORTERM=truecolor",
        { TERM: "xterm-256color", COLORTERM: "truecolor" },
        SPACE_TRUE_COLORS,
      ],
      ["TERM=dumb", { TERM: "dumb", COLORTERM: "truecolor" }, SPACE_MONO],
    ])("detects %s", async (_name, env, expected) => {
      const run = await runInTerminal({ command: colorSpace, env });

      expect(resultOf(run)).toEqual({ colorSpace: expected, isTTY: true });
    });
  });

  describe(`color detection through a real pipe (${runtime.name})`, () => {
    test("disables colors when COLORTERM is set but stdout is a pipe", async () => {
      const run = await runWithPipe({
        command: colorSpace,
        env: { TERM: "xterm-256color", COLORTERM: "truecolor" },
      });

      expect(resultOf(run)).toEqual({ colorSpace: SPACE_MONO, isTTY: false });
    });
  });
}
