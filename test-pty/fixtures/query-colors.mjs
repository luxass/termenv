// Runs the color queries named in the arguments, in order, and prints the results.
// Usage: query-colors.mjs <timeout-ms> <query>...
// Queries: foreground, background, dark, and parallel (foreground and background at the same time).
import {
  hasDarkBackground,
  queryBackgroundColor,
  queryForegroundColor,
} from "../../dist/utils.mjs";

// How long to read stdin after the queries, to catch answers that arrive late or were never read.
// It must outlast the longest cursor answer delay the tests use (50 ms).
const LEFTOVER_READ_TIME = 100;

const [timeoutArgument, ...queryNames] = process.argv.slice(2);
const options = { timeout: Number(timeoutArgument) };

const queries = {
  foreground: () => queryForegroundColor(options),
  background: () => queryBackgroundColor(options),
  dark: () => hasDarkBackground(options),
  parallel: () => Promise.all([queryForegroundColor(options), queryBackgroundColor(options)]),
};

/**
 * Reads stdin in raw mode for a while and returns what arrived.
 *
 * Afterwards it puts stdin back exactly the way the queries left it. Otherwise it would hide bugs,
 * for example a query that forgets to pause stdin and keeps the process running.
 */
async function readLeftoverInput(milliseconds) {
  const wasRaw = process.stdin.isRaw === true;
  const wasFlowing = process.stdin.readableFlowing === true;
  const decoder = new TextDecoder();
  let leftover = "";
  const onData = (chunk) => {
    leftover += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
  };

  process.stdin.setRawMode(true);
  process.stdin.on("data", onData);
  process.stdin.resume();
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
  process.stdin.off("data", onData);
  process.stdin.setRawMode(wasRaw);
  if (!wasFlowing) process.stdin.pause();

  return leftover;
}

const results = {};
for (const name of queryNames) {
  const started = performance.now();
  const value = await queries[name]();
  results[name] = { value: value ?? null, duration: Math.round(performance.now() - started) };
}

// Check stdin before reading leftovers, which changes it for a moment.
const isRawAfter = process.stdin.isRaw === true;
const isFlowingAfter = process.stdin.readableFlowing === true;
const leftoverInput = await readLeftoverInput(LEFTOVER_READ_TIME);

process.stdout.write(
  `RESULT ${JSON.stringify({ results, isRawAfter, isFlowingAfter, leftoverInput })}\n`,
);
// No process.exit(): the harness checks that the program exits by itself.
