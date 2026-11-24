/**
 * @internal
 *
 * Typed access to the runtime globals that termenv reads.
 * This module is not part of the public API.
 */

/**
 * The parts of `process` that termenv reads.
 *
 * Every field is optional. Each runtime exposes a different subset, and test mocks often pass only one or two fields.
 */
export interface RuntimeProcess {
  env?: Record<string, string | undefined>;
  argv?: string[];
  platform?: string;
  versions?: { node?: string };
  stdout?: {
    isTTY?: boolean;
    columns?: number;
    rows?: number;
  };
}

/**
 * The parts of `globalThis` that termenv reads to detect the runtime and its terminal.
 */
export interface RuntimeGlobal {
  Deno?: unknown;
  Bun?: unknown;
  process?: RuntimeProcess;
  window?: { chrome?: unknown };
}

/**
 * Returns the mock global when one is given, and `globalThis` otherwise.
 *
 * `undefined` and `null` select `globalThis`.
 */
export function resolveRuntimeGlobal(mockGlobal: unknown): RuntimeGlobal {
  return mockGlobal ?? globalThis;
}

/**
 * Checks whether an environment variable has a value.
 *
 * A variable set to an empty string has no value. This matches how `NO_COLOR` and most CI variables are defined.
 */
export function hasValue(value: string | undefined): value is string {
  return value !== undefined && value !== "";
}
