import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(() => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  resolve: {
    alias: {
      "@tanky/core": resolve(__dirname, "../../packages/core/src/index.ts"),
      "@tanky/provider-es": resolve(
        __dirname,
        "../../packages/provider-es/src/index.ts",
      ),
      "@tanky/sdk": resolve(__dirname, "../../packages/sdk/src/index.ts"),
      "@tanky/types": resolve(__dirname, "../../packages/types/src/index.ts"),
    },
  },
}));
