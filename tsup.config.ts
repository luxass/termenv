import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: [
      "./src/index.ts",
    ],
    format: ["cjs", "esm"],
    platform: "node",
    target: "es2022",
    dts: true,
    treeshake: true,
    bundle: true,
    clean: true,
    outExtension(ctx) {
      return {
        js: ctx.format === "cjs" ? ".cjs" : ".mjs",
      };
    },
  },
  {
    entry: {
      index: "./src/index.browser.ts",
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
