import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: [
      "./src/index.ts",
      "./src/supports.ts",
      "./src/unicode.ts",
      "./src/utils.ts",
    ],
    format: ["cjs", "esm"],
    platform: "node",
    target: "es2022",
    dts: true,
    treeshake: true,
    bundle: true,
    clean: false,
    outExtension(ctx) {
      return {
        js: ctx.format === "cjs" ? ".cjs" : ".mjs",
      };
    },
  },
  {
    entry: [
      "./src/index.browser.ts",
      "./src/supports.browser.ts",
      "./src/unicode.browser.ts",
    ],
    format: ["cjs", "esm"],
    platform: "browser",
    outDir: "dist/browser",
    target: "es2022",
    dts: true,
    treeshake: true,
    clean: true,
    bundle: true,
    outExtension(ctx) {
      return {
        js: ctx.format === "cjs" ? ".cjs" : ".mjs",
      };
    },
  },
]);
