import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    __KHAOSBOX_DEBUG_PACKAGE__: JSON.stringify(process.env.KHAOSBOX_DEBUG_PACKAGE === '1'),
  },
  build: {
    outDir: path.resolve(__dirname, '../artifacts/desktop/main'),
    emptyOutDir: true,
    lib: {
      entry: {
        main: path.resolve(__dirname, '../src/desktop/main.ts'),
        preload: path.resolve(__dirname, '../src/desktop/preload.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'electron',
        'node:child_process',
        'node:fs',
        'node:fs/promises',
        'node:path',
        'node:url',
      ],
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
});
