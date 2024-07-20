import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "./src/index.ts",
    "./src/supports.ts",
    "./src/unicode.ts",
    "./src/utils.ts",
    "./src/window-size.ts",
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
});
