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
  runtime: "deno" | "node" | "bun";
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
  const isDeno = Deno != null;
  const isBun = Bun != null;

  // @ts-ignore - we fallback to using `{}` so this is fine.
  // eslint-disable-next-line node/prefer-global/process
  const proc = _global.process || Deno || {};

  let env: Record<string, string | undefined> = proc.env || {};
  if (isDeno) {
    try {
      env = Deno.env.toObject();
    } catch {
      env = {};
    }
  }

  return {
    env,
    isTTY: isDeno ? Deno.isatty(1) : !!(proc.stdout?.isTTY),
    platform: isDeno ? Deno.build.os : proc.platform,
    argv: proc.argv || (proc as any).args || [],
    runtime: isDeno ? "deno" : isBun ? "bun" : "node",
  };
}
