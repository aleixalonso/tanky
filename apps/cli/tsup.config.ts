import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  noExternal: ["@tanky/sdk", "@tanky/core", "@tanky/provider-es", "@tanky/types"],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
