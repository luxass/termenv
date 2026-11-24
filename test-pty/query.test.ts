import { describe, expect, setDefaultTimeout, test } from "bun:test";

import {
  expectCleanRun,
  fixture,
  getRuntimes,
  hasLeakedAnswer,
  isPtySupported,
  runInTerminal,
  TEST_TIMEOUT,
} from "./harness";

setDefaultTimeout(TEST_TIMEOUT);

const DARK_BACKGROUND = "rgb:2424/2727/3a3a";
const LIGHT_BACKGROUND = "rgb:fafa/f4f4/eded";
const FOREGROUND = "rgb:cdcd/d6d6/f4f4";

// For queries that the terminal answers, give the library a timeout longer than the harness deadline.
// A query that waits for its timeout, and doesn't finish on the answer, then gets the program killed
// and fails the test. No duration limit is needed, so a slow machine can't cause a false failure.
const LONGER_THAN_DEADLINE = "60000";

interface QueryResult {
  results: Record<string, { value: unknown; duration: number }>;
  isRawAfter: boolean;
  isFlowingAfter: boolean;
  leftoverInput: string;
}

/**
 * Checks what every query run must do: leave raw mode off, leave stdin paused so the process can exit,
 * leave no unread answer, and echo nothing.
 */
function expectNoTrace(run: Awaited<ReturnType<typeof runInTerminal>>, result: QueryResult): void {
  expect(result.isRawAfter).toBe(false);
  expect(result.isFlowingAfter).toBe(false);
  expect(result.leftoverInput).toBe("");
  expect(hasLeakedAnswer(run)).toBe(false);
}

describe.skipIf(!isPtySupported)("hasLeakedAnswer", () => {
  // A shell in canonical mode with echo on doesn't read the answers, so the terminal echoes them.
  test("detects answers that a program didn't read", async () => {
    const run = await runInTerminal({
      command: ["sh", "-c", String.raw`printf '\033]11;?\033\\\033[6n'; sleep 0.3`],
      terminal: { background: DARK_BACKGROUND },
    });

    expect(run.queries).toEqual(["OSC 11", "CSI 6n"]);
    expect(hasLeakedAnswer(run)).toBe(true);
  });
});

for (const runtime of getRuntimes()) {
  const queryColors = (...queryArguments: string[]): string[] => [
    ...runtime.command,
    fixture("query-colors.mjs"),
    ...queryArguments,
  ];

  const skipReason = runtime.skipReason === undefined ? "" : `, skipped: ${runtime.skipReason}`;

  describe.skipIf(!isPtySupported || runtime.skipReason !== undefined)(
    `color queries in a real PTY (${runtime.name}${skipReason})`,
    () => {
      test("reads the background color from an OSC 11 answer", async () => {
        const run = await runInTerminal({
          command: queryColors(LONGER_THAN_DEADLINE, "background"),
          terminal: { background: DARK_BACKGROUND },
        });
        const result = expectCleanRun(run) as QueryResult;

        expect(run.queries).toEqual(["OSC 11", "CSI 6n"]);
        expect(result.results.background?.value).toEqual({ red: 36, green: 39, blue: 58 });
        expectNoTrace(run, result);
      });

      test("waits for the cursor position answer, even when it comes late", async () => {
        const run = await runInTerminal({
          command: queryColors(LONGER_THAN_DEADLINE, "background"),
          terminal: { background: DARK_BACKGROUND, cursorPositionDelay: 50 },
        });
        const result = expectCleanRun(run) as QueryResult;

        expect(result.results.background?.value).toEqual({ red: 36, green: 39, blue: 58 });
        // A query that stopped reading after the color answer would leave the cursor answer unread.
        expectNoTrace(run, result);
      });

      test("answers several queries in a row on the same stdin", async () => {
        const run = await runInTerminal({
          command: queryColors(LONGER_THAN_DEADLINE, "foreground", "background", "dark"),
          terminal: { foreground: FOREGROUND, background: DARK_BACKGROUND },
        });
        const result = expectCleanRun(run) as QueryResult;

        expect(run.queries).toEqual(["OSC 10", "CSI 6n", "OSC 11", "CSI 6n", "OSC 11", "CSI 6n"]);
        expect(result.results.foreground?.value).toEqual({ red: 205, green: 214, blue: 244 });
        expect(result.results.background?.value).toEqual({ red: 36, green: 39, blue: 58 });
        expect(result.results.dark?.value).toBe(true);
        expectNoTrace(run, result);
      });

      test("runs queries started at the same time one after another", async () => {
        const run = await runInTerminal({
          command: queryColors(LONGER_THAN_DEADLINE, "parallel"),
          // The delay makes the order meaningful: with the queue, the second query can only follow the late answer.
          terminal: {
            foreground: FOREGROUND,
            background: DARK_BACKGROUND,
            cursorPositionDelay: 50,
          },
        });
        const result = expectCleanRun(run) as QueryResult;

        // The second query must start only after the terminal answered the first one.
        // Without the queue, the second query is sent before the delayed cursor answer.
        const firstQueryAnswered = run.timeline.indexOf("answer CSI 6n");
        const secondQuerySent = run.timeline.indexOf("query OSC 11");
        expect(firstQueryAnswered).toBeGreaterThan(-1);
        expect(secondQuerySent).toBeGreaterThan(firstQueryAnswered);
        expect(result.results.parallel?.value).toEqual([
          { red: 205, green: 214, blue: 244 },
          { red: 36, green: 39, blue: 58 },
        ]);
        expectNoTrace(run, result);
      });

      test("detects a light background", async () => {
        const run = await runInTerminal({
          command: queryColors(LONGER_THAN_DEADLINE, "dark"),
          terminal: { background: LIGHT_BACKGROUND },
        });
        const result = expectCleanRun(run) as QueryResult;

        expect(result.results.dark?.value).toBe(false);
        expectNoTrace(run, result);
      });

      test("returns at once when the terminal ignores the color query", async () => {
        const run = await runInTerminal({
          command: queryColors(LONGER_THAN_DEADLINE, "background"),
        });
        const result = expectCleanRun(run) as QueryResult;

        expect(run.queries).toEqual(["OSC 11", "CSI 6n"]);
        expect(result.results.background?.value).toBeNull();
        expectNoTrace(run, result);
      });

      test("gives up after the timeout when the terminal answers nothing", async () => {
        const run = await runInTerminal({
          command: queryColors("200", "background"),
          terminal: { answersCursorPosition: false },
        });
        const result = expectCleanRun(run) as QueryResult;

        expect(run.queries).toEqual(["OSC 11", "CSI 6n"]);
        expect(result.results.background?.value).toBeNull();
        // Scheduling delays only make the duration longer, so this lower bound can't fail on a slow machine.
        expect(result.results.background?.duration).toBeGreaterThanOrEqual(190);
        expectNoTrace(run, result);
      });

      test("keeps waiting when only the color query is answered", async () => {
        const run = await runInTerminal({
          command: queryColors("200", "background"),
          terminal: { background: DARK_BACKGROUND, answersCursorPosition: false },
        });
        const result = expectCleanRun(run) as QueryResult;

        // Without the cursor answer, the query can't know the color answer belongs to it, so it times out.
        expect(result.results.background?.value).toBeNull();
        expect(result.results.background?.duration).toBeGreaterThanOrEqual(190);
        expect(result.isRawAfter).toBe(false);
        expect(result.isFlowingAfter).toBe(false);
      });

      test("doesn't query inside tmux", async () => {
        const run = await runInTerminal({
          command: queryColors(LONGER_THAN_DEADLINE, "background"),
          env: { TERM: "tmux-256color" },
          terminal: { background: DARK_BACKGROUND },
        });
        const result = expectCleanRun(run) as QueryResult;

        expect(run.queries).toEqual([]);
        expect(result.results.background?.value).toBeNull();
      });
    },
  );
}
