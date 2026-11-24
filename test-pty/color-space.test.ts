import { describe, expect, setDefaultTimeout, test } from "bun:test";

import { SPACE_256_COLORS, SPACE_MONO, SPACE_TRUE_COLORS } from "../src/supports";
import {
  expectCleanRun,
  fixture,
  getRuntimes,
  isPtySupported,
  runInTerminal,
  runWithPipe,
  TEST_TIMEOUT,
} from "./harness";

setDefaultTimeout(TEST_TIMEOUT);

interface ColorSpaceResult {
  colorSpace: number;
  isTTY: boolean;
}

for (const runtime of getRuntimes()) {
  const colorSpace = [...runtime.command, fixture("color-space.mjs")];
  const skipReason = runtime.skipReason === undefined ? "" : `, skipped: ${runtime.skipReason}`;

  describe.skipIf(!isPtySupported || runtime.skipReason !== undefined)(
    `color detection in a real PTY (${runtime.name}${skipReason})`,
    () => {
      test.each([
        ["TERM=xterm-256color", { TERM: "xterm-256color" }, SPACE_256_COLORS],
        [
          "COLORTERM=truecolor",
          { TERM: "xterm-256color", COLORTERM: "truecolor" },
          SPACE_TRUE_COLORS,
        ],
        ["TERM=xterm-ghostty", { TERM: "xterm-ghostty" }, SPACE_TRUE_COLORS],
        ["NO_COLOR=1", { TERM: "xterm-256color", NO_COLOR: "1" }, SPACE_MONO],
        ["TERM=dumb", { TERM: "dumb", COLORTERM: "truecolor" }, SPACE_MONO],
      ])("detects %s", async (_name, env, expected) => {
        const run = await runInTerminal({ command: colorSpace, env });

        expect(expectCleanRun(run) as ColorSpaceResult).toEqual({
          colorSpace: expected,
          isTTY: true,
        });
      });
    },
  );

  describe.skipIf(runtime.skipReason !== undefined)(
    `color detection through a real pipe (${runtime.name}${skipReason})`,
    () => {
      test("disables colors when COLORTERM is set but stdout is a pipe", async () => {
        const run = await runWithPipe({
          command: colorSpace,
          env: { TERM: "xterm-256color", COLORTERM: "truecolor" },
        });

        expect(expectCleanRun(run) as ColorSpaceResult).toEqual({
          colorSpace: SPACE_MONO,
          isTTY: false,
        });
      });

      test("keeps forced colors for a pipe", async () => {
        const run = await runWithPipe({
          command: colorSpace,
          env: { COLORTERM: "ansi256", FORCE_COLOR: "true" },
        });

        expect(expectCleanRun(run) as ColorSpaceResult).toEqual({
          colorSpace: SPACE_256_COLORS,
          isTTY: false,
        });
      });
    },
  );
}
