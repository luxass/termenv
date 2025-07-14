import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "./src/index.ts",
    "./src/supports.ts",
    "./src/unicode.ts",
    "./src/utils.ts",
    "./src/window-size.ts",
  ],
  format: ["esm"],
  platform: "node",
  target: "es2022",
  dts: true,
  treeshake: true,
  publint: true,
  exports: true,
  clean: true,
});
