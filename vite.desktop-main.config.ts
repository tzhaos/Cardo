import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: path.resolve(__dirname, 'artifacts/desktop/main'),
    emptyOutDir: true,
    lib: {
      entry: {
        main: path.resolve(__dirname, 'src/desktop/main.ts'),
        preload: path.resolve(__dirname, 'src/desktop/preload.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['electron', 'node:fs/promises', 'node:path', 'node:url'],
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
});
