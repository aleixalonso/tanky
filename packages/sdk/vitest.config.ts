import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@tanky/core": resolve(__dirname, "../core/src/index.ts"),
      "@tanky/provider-es": resolve(__dirname, "../provider-es/src/index.ts"),
      "@tanky/types": resolve(__dirname, "../types/src/index.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
