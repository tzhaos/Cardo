import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

function copyDesktopTrayIcon() {
  return {
    name: 'copy-desktop-tray-icon',
    writeBundle(options: { dir?: string }) {
      const outDir = options.dir
        ? path.resolve(options.dir)
        : path.resolve(__dirname, '../artifacts/desktop/main');
      fs.copyFileSync(
        path.resolve(__dirname, '../assets/extension-shell/icons/icon-32.png'),
        path.join(outDir, 'tray-icon.png'),
      );
    },
  };
}

export default defineConfig({
  define: {
    __KHAOSBOX_DEBUG_PACKAGE__: JSON.stringify(process.env.KHAOSBOX_DEBUG_PACKAGE === '1'),
  },
  plugins: [copyDesktopTrayIcon()],
  build: {
    outDir: path.resolve(__dirname, '../artifacts/desktop/main'),
    emptyOutDir: true,
    lib: {
      entry: {
        main: path.resolve(__dirname, '../src/desktop/main.ts'),
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
