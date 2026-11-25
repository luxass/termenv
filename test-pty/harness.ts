/**
 * Runs termenv in a real terminal session and plays the terminal app on the other side.
 *
 * `Bun.Terminal` asks the operating system for a pseudo-terminal (PTY): a pair of connected endpoints.
 * The program under test gets one end as its stdin and stdout, so it sees a real terminal: `isTTY` is true,
 * raw mode works, and typed input is echoed. The harness holds the other end, where a terminal app would sit.
 * It reads what the program writes and answers its queries, the way a terminal app does.
 *
 * Bun only opens the PTY. Each fixture runs as its own process under Bun and under Node.js.
 *
 * When a test fails, the error lists what went wrong, the queries and answers in order, and the
 * program's output, so you can usually see the cause without rerunning anything.
 */

import { mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ESC = "\u001B";

/** How long a test may run. Longer than the deadline, so a hang fails with the harness's own report. */
export const TEST_TIMEOUT = 10_000;

/** How long a program may run before the harness kills it. */
const DEADLINE = 3000;

/** How long to wait for the last output after the program exits. */
const OUTPUT_DRAIN_TIMEOUT = 500;

/** `Bun.Terminal` exists from Bun 1.3.5, and not on Windows. */
export const isPtySupported = typeof Bun.Terminal === "function" && process.platform !== "win32";

// In CI, a job meant to run these tests must fail, not go green with every test skipped.
if (process.env.REQUIRE_PTY === "1" && !isPtySupported) {
  throw new Error(`REQUIRE_PTY=1, but Bun ${Bun.version} on ${process.platform} can't open a PTY.`);
}

const REPOSITORY_ROOT = fileURLToPath(new URL("..", import.meta.url));

// The fixtures import the built dist/. A stale build would test old code and give confusing results.
assertDistIsFresh();

/** Lists every file in a directory and its subdirectories, as absolute paths. */
function listFiles(directory: string): string[] {
  return readdirSync(directory, { recursive: true, withFileTypes: true, encoding: "utf8" })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

function assertDistIsFresh(): void {
  const builtFiles = listFiles(join(REPOSITORY_ROOT, "dist")).filter((path) =>
    path.endsWith(".mjs"),
  );
  if (builtFiles.length === 0) {
    throw new Error("dist/ has no build. Run `pnpm test:pty`, which builds first.");
  }

  const oldestBuild = Math.min(...builtFiles.map((path) => statSync(path).mtimeMs));
  const changedFile = listFiles(join(REPOSITORY_ROOT, "src")).find(
    (path) => statSync(path).mtimeMs > oldestBuild,
  );
  if (changedFile !== undefined) {
    const name = changedFile.slice(REPOSITORY_ROOT.length);
    throw new Error(
      `${name} changed after the last build. Run \`pnpm test:pty\`, which builds first.`,
    );
  }
}

export interface Runtime {
  name: string;
  command: string[];
}

/** The runtimes every fixture runs on: this Bun, and Node.js when it's installed. */
export function getRuntimes(): Runtime[] {
  const runtimes: Runtime[] = [{ name: `bun ${Bun.version}`, command: [process.execPath] }];
  const node = Bun.which("node");
  if (node !== null) runtimes.push({ name: "node", command: [node] });
  return runtimes;
}

/** The absolute path to a fixture in `test-pty/fixtures`. */
export function fixture(name: string): string {
  return fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
}

/** How the fake terminal app answers. */
export interface FakeTerminal {
  /** The answer to OSC 10, such as `rgb:cdcd/d6d6/f4f4`. When missing, the query is ignored. */
  foreground?: string;

  /** The answer to OSC 11, such as `rgb:2424/2727/3a3a`. When missing, the query is ignored. */
  background?: string;

  /** Whether to answer the cursor position query (`CSI 6n`). Every real terminal does. @default true */
  answersCursorPosition?: boolean;
}

export interface RunOptions {
  command: string[];

  /** Environment variables for the program. Nothing is inherited from your shell except `PATH` and `HOME`. */
  env?: Record<string, string>;
}

export interface ProgramRun {
  /** What went wrong with the run itself, such as a hang or a crash. Empty when the run was clean. */
  problems: string[];

  /** The queries the program sent and the answers the terminal gave, in order. Empty for pipe runs. */
  timeline: string[];

  /** Answers the terminal sent, used to check whether any was echoed back unread. */
  answers: string[];

  /** Everything the program wrote. */
  output: string;
}

// The queries the fake terminal recognizes: OSC 10, OSC 11, and the cursor position query.
// oxlint-disable-next-line no-control-regex -- Terminal queries are made of control characters.
const QUERY_PATTERN = /\u001B\](?<oscCode>1[01]);\?(?:\u0007|\u001B\\)|\u001B\[6n/gu;

function buildEnvironment(env: Record<string, string> | undefined): Record<string, string> {
  return { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? tmpdir(), ...env };
}

/**
 * Runs `use` in a new empty directory and deletes it afterwards, so runtimes can't load `.env`,
 * `package.json`, or lock files from the repository.
 */
async function inEmptyDirectory<T>(use: (directory: string) => Promise<T>): Promise<T> {
  const directory = mkdtempSync(join(tmpdir(), "termenv-pty-"));
  try {
    return await use(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/**
 * Waits for the program to exit, kills it with SIGKILL at the deadline, and returns what went wrong.
 */
async function waitForExit(proc: Bun.Subprocess, outputDone: Promise<unknown>): Promise<string[]> {
  let killed = false;
  const timer = setTimeout(() => {
    killed = true;
    proc.kill("SIGKILL");
  }, DEADLINE);
  await proc.exited;
  clearTimeout(timer);

  const outputComplete = await Promise.race([
    outputDone.then(() => true),
    Bun.sleep(OUTPUT_DRAIN_TIMEOUT).then(() => false),
  ]);

  const problems: string[] = [];
  if (killed)
    problems.push(
      `it didn't exit within ${DEADLINE} ms, so it was killed (stdin probably kept it alive)`,
    );
  else if (proc.exitCode !== 0) problems.push(`it exited with code ${String(proc.exitCode)}`);
  if (!outputComplete) problems.push("its output didn't finish, so the end may be missing");
  return problems;
}

/** Runs a program in a real PTY and answers its terminal queries. */
export async function runInTerminal(
  options: RunOptions & { terminal?: FakeTerminal },
): Promise<ProgramRun> {
  const { foreground, background, answersCursorPosition = true } = options.terminal ?? {};
  const decoder = new TextDecoder();
  const timeline: string[] = [];
  const answers: string[] = [];
  let output = "";
  let scannedUntil = 0;
  const { promise: ptyClosed, resolve: closePty } = Promise.withResolvers<void>();

  const answer = (terminal: Bun.Terminal, label: string, text: string): void => {
    timeline.push(`answer ${label}`);
    answers.push(text);
    terminal.write(text);
  };

  return inEmptyDirectory(async (directory) => {
    const proc = Bun.spawn(options.command, {
      cwd: directory,
      env: { TERM: "xterm-256color", ...buildEnvironment(options.env) },
      terminal: {
        cols: 80,
        rows: 24,
        data(terminal, chunk) {
          output += decoder.decode(chunk, { stream: true });
          QUERY_PATTERN.lastIndex = scannedUntil;
          for (const match of output.matchAll(QUERY_PATTERN)) {
            scannedUntil = match.index + match[0].length;
            const oscCode = match.groups?.oscCode;

            if (oscCode === undefined) {
              timeline.push("query CSI 6n");
              if (answersCursorPosition) answer(terminal, "CSI 6n", `${ESC}[1;1R`);
              continue;
            }

            timeline.push(`query OSC ${oscCode}`);
            const color = oscCode === "10" ? foreground : background;
            if (color !== undefined)
              answer(terminal, `OSC ${oscCode}`, `${ESC}]${oscCode};${color}${ESC}\\`);
          }
        },
        exit() {
          closePty();
        },
      },
    });

    try {
      const problems = await waitForExit(proc, ptyClosed);
      return { problems, timeline, answers, output };
    } finally {
      proc.terminal?.close();
    }
  });
}

/** Runs a program with its stdout connected to a real pipe, not a terminal. */
export async function runWithPipe(options: RunOptions): Promise<ProgramRun> {
  return inEmptyDirectory(async (directory) => {
    const proc = Bun.spawn(options.command, {
      cwd: directory,
      env: buildEnvironment(options.env),
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    });

    let output = "";
    const reads = Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]).then(([stdout, stderr]) => {
      output = stdout + stderr;
    });
    const problems = await waitForExit(proc, reads);
    return { problems, timeline: [], answers: [], output };
  });
}

/**
 * Returns the fixture's `RESULT {...}` value, or throws an error that explains what went wrong.
 * The error includes the queries and answers in order, and the program's output.
 */
export function resultOf(run: ProgramRun): unknown {
  const problems = [...run.problems];
  const resultLine = /RESULT (?<json>\{.*\})/u.exec(run.output)?.groups?.json;
  let result: unknown;

  if (resultLine === undefined) {
    problems.push("it printed no RESULT line");
  } else {
    try {
      result = JSON.parse(resultLine);
    } catch (error) {
      problems.push(`its RESULT line isn't valid JSON (${(error as Error).message})`);
    }
  }

  if (problems.length > 0) {
    const timeline = run.timeline.length > 0 ? run.timeline.join(" → ") : "(none)";
    const output = JSON.stringify(run.output.replaceAll(ESC, "ESC"));
    throw new Error(
      `The program failed: ${problems.join("; ")}.\nQueries and answers: ${timeline}\nOutput: ${output}`,
    );
  }

  return result;
}

/**
 * Checks whether the terminal echoed back an answer it sent. That happens when the program isn't reading
 * in raw mode when the answer arrives, and the user would see the answer as garbage on the screen.
 * With `echoctl` on, ESC is echoed as `^[`. With it off, ESC is echoed as is.
 */
export function hasLeakedAnswer(run: ProgramRun): boolean {
  return run.answers.some(
    (text) => run.output.includes(text) || run.output.includes(text.replaceAll(ESC, "^[")),
  );
}
