import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: path.resolve(__dirname, '../artifacts/native-host'),
    emptyOutDir: true,
    ssr: path.resolve(__dirname, '../src/native-host/main.ts'),
    target: 'node22',
    rollupOptions: {
      external: ['node:child_process', 'node:fs', 'node:path', 'node:url'],
      output: {
        format: 'cjs',
        entryFileNames: 'host.cjs',
      },
    },
  },
});
