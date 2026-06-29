import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: path.resolve(__dirname, '../artifacts/desktop/main'),
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, '../src/desktop/preload.ts'),
      formats: ['cjs'],
      fileName: () => 'preload.cjs',
    },
    rollupOptions: {
      external: ['electron'],
    },
  },
});
