/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { resolve } from 'path';
// import { defineConfig } from 'vitest/config';
export default defineConfig({
    resolve: {
      alias: {
        '@': resolve(__dirname, 'lib'),
      },
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
