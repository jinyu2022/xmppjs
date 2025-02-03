/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { resolve } from "path";
// import { defineConfig } from "vitest/config";
import dts from "vite-plugin-dts";
export default defineConfig({
  plugins: [
    dts({
      include: ["lib/**/*.ts", "index.ts"],
      exclude: ["**/*.test.ts", "**/*.spec.ts"],
      rollupTypes: true
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "lib"),
    },
  },
  build: {
    sourcemap: true, // 启用源映射
    lib: {
      entry: "./index.ts",
      name: "xmppjs",
      formats: ["es"],
    },
    target: ["es2022", "node20"],
    rollupOptions: {
      external: [
        "net",
        "tls",
        "dns/promises",
        "fs/promises",
        "@xmldom/xmldom",
        "image-size",
        "ws",
        "events",
        "loglevel",
        "uuid"
      ],
      output: {
        preserveModules: true,
        entryFileNames: "[name].js", // 关键配置：保持入口文件名为源文件名
        chunkFileNames: "[name].js", // 关键配置：保持 chunk 文件名为源文件名 (如果生成 chunk)
        assetFileNames: "[name].[ext]", // 关键配置：保持 asset 文件名为源文件名 (如果生成 asset)
      },
    },
  },
  test: {
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    globals: true,
    environment: "node",
    setupFiles: ["./setup.ts"],
  },
});
