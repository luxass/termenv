/**
 * A test harness that runs a program in a real pseudo-terminal (PTY) and plays the terminal.
 *
 * Bun opens the PTY, so the harness itself runs under `bun test`. The program under test is a separate
 * process, so it can run on any runtime: Node.js, Bun, or Deno.
 *
 * The fake terminal answers queries the way a real terminal does. It always answers the cursor position
 * query (`CSI 6n`), and it answers color queries (OSC 10 and OSC 11) only when the test gives it colors.
 *
 * Tested on macOS with Bun 1.4.4 and 1.4.5 and Node.js 24. Linux and Deno are not tested yet.
 * Deno is optional: the tests use it only when Deno 2 or later is installed.
 * `REQUIRE_PTY=1` makes a missing PTY an error. It doesn't require Deno or prove Linux coverage.
 */

import { mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ESC = "\u001B";

/**
 * How long a test may run. It's longer than the harness deadline, so a hanging program fails
 * with the harness's own report and not with Bun's generic test timeout.
 */
export const TEST_TIMEOUT = 10_000;

/**
 * How long the harness waits for a program to exit by itself before it kills it.
 */
const DEFAULT_DEADLINE = 3000;

/**
 * How long to wait for the last output after the program exits.
 *
 * Older Bun versions resolve `proc.exited` before the PTY is drained, and a descendant process can keep
 * a pipe open. When the output doesn't finish in time, the run is marked as incomplete and fails.
 */
const OUTPUT_DRAIN_TIMEOUT = 500;

/**
 * How long the Deno version probe may take before Deno is skipped.
 */
const DENO_PROBE_TIMEOUT = 2000;

/**
 * Checks whether this Bun version can open a PTY. `Bun.Terminal` exists from Bun 1.3.5, and not on Windows.
 */
export const isPtySupported = typeof Bun.Terminal === "function" && process.platform !== "win32";

// In CI, a lane meant to run PTY tests must fail, not go green with every test skipped.
if (process.env.REQUIRE_PTY === "1" && !isPtySupported) {
  throw new Error(
    `REQUIRE_PTY=1, but this environment can't open a PTY (Bun ${Bun.version}, ${process.platform})`,
  );
}

const REPOSITORY_ROOT = fileURLToPath(new URL("..", import.meta.url));

// The fixtures import the built dist/. Running `bun test ./test-pty` after editing src/ without a build
// would test stale code, so stop before any test runs.
assertDistIsFresh();

/**
 * Throws when any file in `src/` is newer than the oldest file in `dist/` that the fixtures can import.
 */
function assertDistIsFresh(): void {
  const distDirectory = join(REPOSITORY_ROOT, "dist");
  const distFiles = listFiles(distDirectory).filter((path) => path.endsWith(".mjs"));
  if (distFiles.length === 0) {
    throw new Error("dist/ has no build. Run `pnpm test:pty`, which builds first.");
  }

  const oldestBuild = Math.min(...distFiles.map((path) => statSync(path).mtimeMs));
  const staleFile = listFiles(join(REPOSITORY_ROOT, "src")).find(
    (path) => statSync(path).mtimeMs > oldestBuild,
  );
  if (staleFile !== undefined) {
    const relativePath = staleFile.slice(REPOSITORY_ROOT.length);
    throw new Error(
      `${relativePath} is newer than dist/. Run \`pnpm test:pty\`, which builds first.`,
    );
  }
}

/**
 * Lists every file in a directory and its subdirectories, as absolute paths.
 */
function listFiles(directory: string): string[] {
  const entries = readdirSync(directory, {
    recursive: true,
    withFileTypes: true,
    encoding: "utf8",
  });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

/**
 * A runtime that can run the fixtures, such as `["node"]`.
 */
export interface Runtime {
  name: string;
  command: string[];

  /** Why the tests skip this runtime, or `undefined` when they run on it. */
  skipReason?: string;
}

/**
 * Returns the runtimes to test. A runtime that is installed but unusable is returned with a `skipReason`,
 * so the test output says why it was skipped.
 */
export function getRuntimes(): Runtime[] {
  const runtimes: Runtime[] = [{ name: `bun ${Bun.version}`, command: [process.execPath] }];

  const node = Bun.which("node");
  if (node !== null) runtimes.push({ name: "node", command: [node] });

  const deno = Bun.which("deno");
  if (deno !== null) {
    const command = [deno, "run", "--allow-env", "--allow-read"];
    const denoVersion = probeDenoMajorVersion(deno);
    if (typeof denoVersion === "string") {
      runtimes.push({ name: "deno", command, skipReason: denoVersion });
    } else if (denoVersion < 2) {
      // The fixtures use the global `process`, which Deno has only from version 2.
      runtimes.push({
        name: "deno",
        command,
        skipReason: `Deno ${denoVersion} has no global process`,
      });
    } else {
      runtimes.push({ name: `deno ${denoVersion}`, command });
    }
  }

  return runtimes;
}

/**
 * Returns Deno's major version, or the reason it couldn't be read.
 */
function probeDenoMajorVersion(deno: string): number | string {
  const result = Bun.spawnSync([deno, "--version"], { timeout: DENO_PROBE_TIMEOUT });
  if (result.exitCode !== 0) {
    return `deno --version failed or took longer than ${DENO_PROBE_TIMEOUT} ms`;
  }

  const match = /deno (?<major>\d+)\./u.exec(result.stdout.toString());
  const major = match?.groups?.major;
  return major === undefined ? "deno --version printed no version" : Number(major);
}

/**
 * Returns the absolute path to a fixture in `test-pty/fixtures`.
 */
export function fixture(name: string): string {
  return fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
}

/**
 * How the fake terminal answers queries.
 */
export interface FakeTerminalOptions {
  /** The answer to OSC 10, such as `rgb:cdcd/d6d6/f4f4`. When missing, the terminal ignores the query. */
  foreground?: string;

  /** The answer to OSC 11, such as `rgb:2424/2727/3a3a`. When missing, the terminal ignores the query. */
  background?: string;

  /**
   * Whether the terminal answers the cursor position query.
   *
   * Every real terminal does. Set it to `false` to test a program that gets no answer at all.
   *
   * @default true
   */
  answersCursorPosition?: boolean;

  /**
   * How long to wait before the cursor position answer, in milliseconds.
   *
   * A delay shows whether the program waits for the cursor answer, or stops reading after the color answer.
   *
   * @default 0
   */
  cursorPositionDelay?: number;
}

export interface RunOptions {
  /** The command to run, such as `["node", "fixture.mjs"]`. */
  command: string[];

  /** Environment variables for the program. `TERM` defaults to `xterm-256color`. */
  env?: Record<string, string>;

  /**
   * How long to wait for the program to exit by itself, in milliseconds. After that, the harness kills it.
   *
   * @default 3000
   */
  deadline?: number;
}

export interface RunInTerminalOptions extends RunOptions {
  /** How the fake terminal answers queries. */
  terminal?: FakeTerminalOptions;
}

export interface ProgramRun {
  /** Whether the program exited by itself before the deadline. */
  exitedByItself: boolean;

  /** The exit code, or `null` when the program was killed. */
  exitCode: number | null;

  /** The signal that ended the program, such as `SIGKILL`, or `null`. */
  signalCode: Bun.Subprocess["signalCode"];

  /** Whether all output arrived. When it's `false`, `output` may be missing the end. */
  outputComplete: boolean;

  /** Everything the program wrote. In a PTY, this also includes the echo of any input that wasn't read in raw mode. */
  output: string;

  /** The `RESULT {...}` line the fixture printed, or `undefined` when there is none. */
  resultLine: string | undefined;

  /** How long the program ran, in milliseconds. */
  duration: number;
}

export interface TerminalRun extends ProgramRun {
  /** The queries the program sent, in order, such as `["OSC 11", "CSI 6n"]`. */
  queries: string[];

  /**
   * Queries and the terminal's answers in the order they happened, such as
   * `["query OSC 11", "query CSI 6n", "answer OSC 11", "answer CSI 6n"]`.
   */
  timeline: string[];

  /** The exact answers the terminal sent, used to check whether any of them was echoed back. */
  answers: string[];
}

// Queries the fake terminal recognizes: OSC 10 and OSC 11 color queries, and the cursor position query.
// oxlint-disable-next-line no-control-regex -- Terminal queries are made of control characters.
const QUERY_PATTERN = /\u001B\](?<oscCode>1[01]);\?(?:\u0007|\u001B\\)|\u001B\[6n/gu;

/**
 * Builds the environment for a program. It doesn't inherit the test runner's environment,
 * so variables such as `COLORTERM` or `NO_COLOR` from your shell can't change the result.
 */
function buildEnvironment(env: Record<string, string> | undefined): Record<string, string> {
  return {
    PATH: process.env.PATH ?? "",
    HOME: process.env.HOME ?? tmpdir(),
    ...env,
  };
}

/**
 * Runs `use` with a new empty working directory and deletes the directory afterwards.
 *
 * An empty directory keeps runtimes from loading `.env`, `package.json`, or lock files from the repository.
 */
async function withEmptyWorkingDirectory<T>(use: (directory: string) => Promise<T>): Promise<T> {
  const directory = mkdtempSync(join(tmpdir(), "termenv-pty-"));
  try {
    return await use(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/**
 * Waits for a program to exit by itself, or kills it with `SIGKILL` at the deadline.
 * A test program has nothing to clean up, so the harness doesn't try `SIGTERM` first.
 */
async function waitForExit(
  proc: Bun.Subprocess,
  deadline: number,
): Promise<{ exitedByItself: boolean; duration: number }> {
  const started = performance.now();
  let killedAtDeadline = false;

  const timer = setTimeout(() => {
    killedAtDeadline = true;
    proc.kill("SIGKILL");
  }, deadline);

  try {
    await proc.exited;
  } finally {
    clearTimeout(timer);
  }

  return { exitedByItself: !killedAtDeadline, duration: performance.now() - started };
}

/**
 * Waits for `promise`, but at most `milliseconds`. Returns whether it settled in time.
 */
async function settlesWithin(promise: Promise<unknown>, milliseconds: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<false>((resolve) => {
    timer = setTimeout(() => {
      resolve(false);
    }, milliseconds);
  });

  try {
    return await Promise.race([promise.then(() => true), timedOut]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs a program in a PTY, answers its terminal queries, and collects what it wrote.
 */
export async function runInTerminal(options: RunInTerminalOptions): Promise<TerminalRun> {
  const {
    foreground,
    background,
    answersCursorPosition = true,
    cursorPositionDelay = 0,
  } = options.terminal ?? {};
  const decoder = new TextDecoder();
  const queries: string[] = [];
  const timeline: string[] = [];
  const answers: string[] = [];
  const pendingAnswers = new Set<ReturnType<typeof setTimeout>>();
  let output = "";
  let scannedUntil = 0;

  const { promise: ptyClosed, resolve: resolvePtyClosed } = Promise.withResolvers<void>();

  const sendAnswer = (
    terminal: Bun.Terminal,
    label: string,
    answer: string,
    delay: number,
  ): void => {
    const send = (): void => {
      if (terminal.closed) return;
      timeline.push(`answer ${label}`);
      answers.push(answer);
      terminal.write(answer);
    };

    if (delay === 0) {
      send();
      return;
    }

    const timer = setTimeout(() => {
      pendingAnswers.delete(timer);
      send();
    }, delay);
    pendingAnswers.add(timer);
  };

  const answerQueries = (terminal: Bun.Terminal): void => {
    QUERY_PATTERN.lastIndex = scannedUntil;
    for (const match of output.matchAll(QUERY_PATTERN)) {
      scannedUntil = match.index + match[0].length;
      const oscCode = match.groups?.oscCode;
      const label = oscCode === undefined ? "CSI 6n" : `OSC ${oscCode}`;
      queries.push(label);
      timeline.push(`query ${label}`);

      if (oscCode === undefined) {
        if (answersCursorPosition) sendAnswer(terminal, label, `${ESC}[1;1R`, cursorPositionDelay);
        continue;
      }

      const color = oscCode === "10" ? foreground : background;
      if (color !== undefined) sendAnswer(terminal, label, `${ESC}]${oscCode};${color}${ESC}\\`, 0);
    }
  };

  return withEmptyWorkingDirectory(async (directory) => {
    const proc = Bun.spawn(options.command, {
      cwd: directory,
      env: { TERM: "xterm-256color", ...buildEnvironment(options.env) },
      terminal: {
        cols: 80,
        rows: 24,
        data(terminal, chunk) {
          output += decoder.decode(chunk, { stream: true });
          answerQueries(terminal);
        },
        exit() {
          resolvePtyClosed();
        },
      },
    });

    try {
      const { exitedByItself, duration } = await waitForExit(
        proc,
        options.deadline ?? DEFAULT_DEADLINE,
      );
      const outputComplete = await settlesWithin(ptyClosed, OUTPUT_DRAIN_TIMEOUT);

      return {
        exitedByItself,
        exitCode: proc.exitCode,
        signalCode: proc.signalCode,
        outputComplete,
        output,
        resultLine: findResultLine(output),
        duration,
        queries,
        timeline,
        answers,
      };
    } finally {
      for (const timer of pendingAnswers) clearTimeout(timer);
      proc.terminal?.close();
    }
  });
}

/**
 * Runs a program with stdout connected to a real pipe, not a terminal.
 */
export async function runWithPipe(options: RunOptions): Promise<ProgramRun> {
  return withEmptyWorkingDirectory(async (directory) => {
    const proc = Bun.spawn(options.command, {
      cwd: directory,
      env: buildEnvironment(options.env),
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    });

    let stdout = "";
    let stderr = "";
    const reads = Promise.all([
      new Response(proc.stdout).text().then((text) => {
        stdout = text;
      }),
      new Response(proc.stderr).text().then((text) => {
        stderr = text;
      }),
    ]);

    const { exitedByItself, duration } = await waitForExit(
      proc,
      options.deadline ?? DEFAULT_DEADLINE,
    );
    // A descendant process can keep the pipes open after the program exits, so the reads get a deadline too.
    const outputComplete = await settlesWithin(reads, OUTPUT_DRAIN_TIMEOUT);

    return {
      exitedByItself,
      exitCode: proc.exitCode,
      signalCode: proc.signalCode,
      outputComplete,
      output: stdout + stderr,
      resultLine: findResultLine(stdout),
      duration,
    };
  });
}

/**
 * Finds the `RESULT {...}` line that fixtures print.
 */
function findResultLine(output: string): string | undefined {
  return /RESULT (?<json>\{.*\})/u.exec(output)?.groups?.json;
}

/**
 * Returns the fixture's parsed result after checking that the run was clean: the program exited by itself
 * with code 0, all output arrived, and it printed a valid `RESULT` line.
 *
 * A fixture can print a correct result and still fail afterwards, so the result alone proves nothing.
 * The error includes the program's output, so a failure shows what the program did.
 * The result is parsed JSON, so callers state its shape with `as`.
 */
export function expectCleanRun(run: ProgramRun): unknown {
  const problems: string[] = [];
  if (!run.exitedByItself)
    problems.push(`it didn't exit by itself, so it was killed with ${String(run.signalCode)}`);
  if (run.exitCode !== 0) problems.push(`it exited with code ${String(run.exitCode)}`);
  if (!run.outputComplete) problems.push("its output didn't finish, so it may be incomplete");
  if (run.resultLine === undefined) problems.push("it printed no RESULT line");

  let result: unknown;
  if (run.resultLine !== undefined) {
    try {
      result = JSON.parse(run.resultLine);
    } catch (error) {
      problems.push(`its RESULT line isn't valid JSON (${(error as Error).message})`);
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `The program failed: ${problems.join(", ")}.\nOutput:\n${JSON.stringify(run.output)}`,
    );
  }

  return result;
}

/**
 * Checks whether the terminal echoed back any answer it sent.
 *
 * With echo on, the terminal prints input it receives. Answers read in raw mode aren't echoed,
 * so an echoed answer means the program wasn't reading when the answer arrived.
 * With `echoctl` on, ESC is echoed as `^[`. With it off, ESC is echoed as is.
 * Only the exact answers the terminal sent count, so a program that prints a color itself isn't a leak.
 */
export function hasLeakedAnswer(run: TerminalRun): boolean {
  return run.answers.some(
    (answer) => run.output.includes(answer) || run.output.includes(answer.replaceAll(ESC, "^[")),
  );
}
