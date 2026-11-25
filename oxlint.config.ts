import { defineConfig } from "oxlint";

export default defineConfig({
  options: {
    typeAware: true,
    typeCheck: true,
    respectEslintDisableDirectives: false,
    reportUnusedDisableDirectives: "error",
  },
  ignorePatterns: ["dist/**", "coverage/**", "node_modules/**"],
  plugins: ["unicorn", "typescript", "oxc"],
  categories: {
    correctness: "error",
    perf: "error",
    suspicious: "error",
    pedantic: "warn",
  },
  rules: {
    "eslint/no-await-in-loop": "off",
    "no-console": ["error", { allow: ["error"] }],
    "no-shadow": "off",
    "eslint/eqeqeq": ["warn", "always", { null: "ignore" }],
    // Measure code size only, so detailed JSDoc doesn't count against the limit.
    "eslint/max-lines": ["warn", { max: 300, skipComments: true, skipBlankLines: true }],
    "typescript/no-explicit-any": "error",
    "typescript/no-unnecessary-boolean-literal-compare": "off",
    "typescript/prefer-readonly-parameter-types": "off",
    "typescript/no-unsafe-type-assertion": "off",
    curly: "off",
  },
  overrides: [
    {
      // PTY fixtures are plain JavaScript that any runtime runs as is. They aren't part of a TypeScript
      // program, so type-aware rules see `process` and the imported dist as error types.
      files: ["test-pty/fixtures/**/*.mjs"],
      rules: {
        "typescript/no-unsafe-argument": "off",
        "typescript/no-unsafe-assignment": "off",
        "typescript/no-unsafe-call": "off",
        "typescript/no-unsafe-member-access": "off",
        "typescript/no-unsafe-return": "off",
      },
    },
    {
      // Keep the public generic signatures that accept cross-runtime mock globals.
      files: ["src/env.ts", "src/supports.ts"],
      rules: {
        "typescript/no-unnecessary-type-parameters": "off",
      },
    },
    {
      files: ["src/env.ts"],
      rules: {
        "no-underscore-dangle": ["error", { allow: ["_global"] }],
      },
    },
    {
      // xterm.js has no public API for cursor visibility or OSC 8 link URLs, so the screen helper reads these.
      files: ["test/terminal-screen.ts"],
      rules: {
        "no-underscore-dangle": ["error", { allow: ["_core", "_oscLinkService"] }],
      },
    },
    {
      // Runtime detection intentionally probes untyped globals across runtimes.
      files: ["src/env.ts", "src/utils.ts", "test/browser/env.test.ts"],
      rules: {
        "typescript/no-explicit-any": "off",
      },
    },
    {
      // Keep all runtime suites linted without imposing test-length or async style.
      files: ["test/**/*", "test-bun/**/*", "test-pty/**/*"],
      rules: {
        "eslint/max-lines": "off",
        "eslint/max-lines-per-function": "off",
        "eslint/require-await": "off",
        "typescript/require-await": "off",
      },
    },
  ],
});
