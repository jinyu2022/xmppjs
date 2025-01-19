// / <reference types="vitest/config" />
// import { defineConfig } from 'vite'
import { resolve, parse } from "path";
import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "lib"),
    },
  },
  build: {
    lib: {
      entry: "./index.ts",
      name: "xmppjs",
      fileName: () => "main.js",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["net", "tls", "dns", "@xmldom/xmldom", "image-size", "ws"],
      output: {
        globals: {
          net: "net",
          tls: "tls",
          dns: "dns",
          "@xmldom/xmldom": "xmldom",
          "image-size": "image-size",
          ws: "ws",
        },
        preserveModules: true,
        preserveModulesRoot: "lib",
        entryFileNames: (chunkInfo) => {
          return `${chunkInfo.name}.js`;
        },
        chunkFileNames: (chunkInfo) => {
          const name = parse(chunkInfo.facadeModuleId || "").name;
          return `${name}.js`;
        },
        dir: "dist/lib",
      },
    },
  },
  optimizeDeps: {
    exclude: ["net", "tls", "dns", "@xmldom/xmldom", "image-size", "ws"], // 确保在优化依赖时排除这些模块
  },
  test: {
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    globals: true,
    environment: "node",
    setupFiles: ["./setup.ts"],
  },
});
