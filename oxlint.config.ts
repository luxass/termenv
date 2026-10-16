import { defineConfig } from "oxlint";

export default defineConfig({
  options: {
    typeAware: true,
    typeCheck: true,
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
    "typescript/no-explicit-any": "error",
    "typescript/no-unnecessary-boolean-literal-compare": "off",
    "typescript/prefer-readonly-parameter-types": "off",
    "typescript/no-unsafe-type-assertion": "off",
    curly: "off",
  },
  overrides: [
    {
      // Runtime detection intentionally probes untyped globals across runtimes.
      files: ["src/env.ts", "src/utils.ts", "test/browser/env.test.ts"],
      rules: {
        "typescript/no-explicit-any": "off",
      },
    },
    {
      // Keep all runtime suites linted without imposing test-length or async style.
      files: ["test/**/*", "test-bun/**/*", "test-deno/**/*"],
      rules: {
        "eslint/max-lines": "off",
        "eslint/max-lines-per-function": "off",
        "eslint/require-await": "off",
        "typescript/require-await": "off",
      },
    },
  ],
});
