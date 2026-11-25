import { describe, expect, setDefaultTimeout, test } from "bun:test";

import {
  fixture,
  getRuntimes,
  hasLeakedAnswer,
  isPtySupported,
  type ProgramRun,
  resultOf,
  runInTerminal,
  TEST_TIMEOUT,
} from "./harness";

setDefaultTimeout(TEST_TIMEOUT);

const FOREGROUND = "rgb:cdcd/d6d6/f4f4";
const DARK_BACKGROUND = "rgb:2424/2727/3a3a";

// Tests that expect a quick answer give the library a timeout longer than the harness deadline.
// A query that waits for its timeout instead of finishing on the answer then gets the program killed.
const LONGER_THAN_DEADLINE = "60000";

interface QueryResult {
  results: Record<string, { value: unknown; duration: number }>;
  isRawAfter: boolean;
  isFlowingAfter: boolean;
  leftoverInput: string;
}

/**
 * The state every query must leave behind: raw mode off, stdin paused so the process can exit,
 * no answer left unread, and no answer echoed to the screen.
 */
function stateAfter(run: ProgramRun, result: QueryResult) {
  return {
    rawMode: result.isRawAfter,
    stdinFlowing: result.isFlowingAfter,
    unreadInput: result.leftoverInput,
    echoedAnswer: hasLeakedAnswer(run),
  };
}

const CLEAN_STATE = { rawMode: false, stdinFlowing: false, unreadInput: "", echoedAnswer: false };

for (const runtime of getRuntimes()) {
  const queryColors = (...queryArguments: string[]): string[] => [
    ...runtime.command,
    fixture("query-colors.mjs"),
    ...queryArguments,
  ];

  describe.skipIf(!isPtySupported)(`color queries in a real terminal (${runtime.name})`, () => {
    test("reads the background color from the terminal's answer", async () => {
      const run = await runInTerminal({
        command: queryColors(LONGER_THAN_DEADLINE, "background"),
        terminal: { background: DARK_BACKGROUND },
      });
      const result = resultOf(run) as QueryResult;

      expect(result.results.background?.value).toEqual({ red: 36, green: 39, blue: 58 });
      expect(stateAfter(run, result)).toEqual(CLEAN_STATE);
    });

    test("answers several queries in a row on the same stdin", async () => {
      const run = await runInTerminal({
        command: queryColors(LONGER_THAN_DEADLINE, "foreground", "background", "dark"),
        terminal: { foreground: FOREGROUND, background: DARK_BACKGROUND },
      });
      const result = resultOf(run) as QueryResult;

      expect(result.results.foreground?.value).toEqual({ red: 205, green: 214, blue: 244 });
      expect(result.results.background?.value).toEqual({ red: 36, green: 39, blue: 58 });
      expect(result.results.dark?.value).toBe(true);
      expect(stateAfter(run, result)).toEqual(CLEAN_STATE);
    });

    test("returns at once when the terminal ignores the color query", async () => {
      const run = await runInTerminal({ command: queryColors(LONGER_THAN_DEADLINE, "background") });
      const result = resultOf(run) as QueryResult;

      expect(result.results.background?.value).toBeNull();
      expect(stateAfter(run, result)).toEqual(CLEAN_STATE);
    });

    test("gives up after the timeout when the terminal answers nothing", async () => {
      const run = await runInTerminal({
        command: queryColors("200", "background"),
        terminal: { answersCursorPosition: false },
      });
      const result = resultOf(run) as QueryResult;

      expect(result.results.background?.value).toBeNull();
      // A slow machine only makes this longer, so the lower bound can't fail by accident.
      expect(result.results.background?.duration).toBeGreaterThanOrEqual(190);
      expect(stateAfter(run, result)).toEqual(CLEAN_STATE);
    });
  });
}
