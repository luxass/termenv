import { defaultExclude, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "**/test-deno/**/*.test.ts",
      "**/test-bun/**/*.test.ts",
      ...defaultExclude,
    ],
  },
});
