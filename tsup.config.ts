import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: [
      "./src/index.ts",
      "./src/supports.ts",
      "./src/unicode.ts",
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
    entry: {
      index: "./src/supports.browser.ts",
    },
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
