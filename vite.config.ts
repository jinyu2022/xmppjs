/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
// import { defineConfig } from 'vitest/config';
export default defineConfig({
  define: {
    globalUtils: {
      DOMParser: '(typeof window !== "undefined" ? window.DOMParser : require("xmldom").DOMParser)',
      // WebSocket: '(typeof window !== "undefined" ? window.WebSocket : require("ws"))',
    }
  },
  build: {
    lib: {
      entry: './lib/main.ts',
      name: 'Counter',
      fileName: 'counter',
    },
  },
  test: {
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    globals: true,
    environment: 'node',
    setupFiles: ['./setup.ts'],
  },
})
