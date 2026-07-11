import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: path.resolve(__dirname, '../artifacts/cli'),
    emptyOutDir: true,
    ssr: path.resolve(__dirname, '../src/cli/main.ts'),
    target: 'node22',
    rollupOptions: {
      external: [
        'node:child_process',
        'node:crypto',
        'node:fs',
        'node:http',
        'node:net',
        'node:os',
        'node:path',
        'node:sqlite',
        'node:url',
        /^node:/,
      ],
      output: {
        format: 'es',
        entryFileNames: 'cardo.js',
      },
    },
  },
});
