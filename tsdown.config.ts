import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "./src/index.ts",
    "./src/supports.ts",
    "./src/utils.ts",
  ],
  format: ["esm"],
  platform: "node",
  target: "node24",
  dts: true,
  treeshake: true,
  publint: true,
  exports: true,
  clean: true,
});
