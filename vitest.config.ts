import { playwright } from "@vitest/browser-playwright";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
    },
    projects: [
      {
        test: {
          name: "unit",
          exclude: [
            "test-bun/**/*.test.ts",
            "test/browser/**/*.test.ts",
            ...configDefaults.exclude,
          ],
          environment: "node",
        },
      },
      {
        test: {
          name: "browser",
          exclude: ["test-bun/**/*.test.ts", "test/*.test.ts", ...configDefaults.exclude],
          include: ["test/browser/**/*.test.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [
              {
                browser: "chromium",
                // We can't use headless mode in browser tests, because window.chrome is not defined in headless mode
                // and therefore fails our color detection logic.
                headless: false,
                screenshotFailures: false,
              },
            ],
          },
        },
      },
    ],
  },
});
