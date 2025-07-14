/**
 * Configuration interface for environment runtime information.
 */
export interface EnvRuntimeConfig {
  /**
   * Indicates whether the current environment supports TTY capabilities
   */
  isTTY: boolean;

  /** Array of command line arguments passed to the process */
  argv: string[];

  /** The operating system platform (e.g., 'win32', 'darwin', 'linux') */
  platform: string;

  /** Environment variables available to the process */
  env: Record<string, string | undefined>;

  /** The JavaScript runtime environment being used */
  runtime: "deno" | "node" | "bun" | "browser" | "unknown";
}

/**
 * Returns runtime configuration details for the current JavaScript environment.
 *
 * @param {globalThis} mockGlobal - Optional global object to use instead of the default globalThis.
 *
 * @returns {EnvRuntimeConfig} The runtime configuration object
 *
 * @example
 * ```ts
 * const config = getRuntimeConfig();
 * console.log(config.runtime); // 'node', 'deno', or 'bun'
 * console.log(config.env.NODE_ENV); // Access environment variables
 *
 * // For mock testing
 * const mockGlobal = { process: { env: { NODE_ENV: 'development' } } };
 * const config = getRuntimeConfig(mockGlobal);
 * ```
 */
export function getRuntimeConfig<TGlobal = typeof globalThis>(mockGlobal?: TGlobal): EnvRuntimeConfig {
  const _global = mockGlobal || globalThis;
  const Deno = (_global as any).Deno;
  const Bun = (_global as any).Bun;
  // eslint-disable-next-line node/prefer-global/process
  const proc = (_global as any).process || {};

  let env = proc.env ?? {};
  try {
    // will trigger a Deno permission request, if running in Deno
    env = proc.env;
  } catch {
    env = {};
  }

  const isDeno = Deno != null;
  const isBun = Bun != null;
  const isNode = !isDeno && !isBun && typeof proc === "object" && proc?.versions?.node;
  const isBrowser = !!(_global as any).window?.chrome;

  const runtime = isDeno
    ? "deno"
    : isBun
      ? "bun"
      : isBrowser
        ? "browser"
        : isNode
          ? "node"
          : "unknown";

  return {
    env,
    isTTY: !!(proc.stdout?.isTTY),
    argv: proc.argv || [],
    platform: proc.platform,
    runtime,
  };
}
