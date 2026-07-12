import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

const PACKAGE_JSON = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'),
) as { version?: string };

function copyDesktopIcons() {
  return {
    name: 'copy-desktop-icons',
    writeBundle(options: { dir?: string }) {
      const outDir = options.dir
        ? path.resolve(options.dir)
        : path.resolve(__dirname, '../artifacts/desktop/main');
      // Tray: small orbit mark (extension icon set is regenerated from cardo-mark.svg).
      fs.copyFileSync(
        path.resolve(__dirname, '../assets/extension-shell/icons/icon-32.png'),
        path.join(outDir, 'tray-icon.png'),
      );
      // Window / taskbar while unpackaged; packaged .exe uses build.icon ICO.
      fs.copyFileSync(
        path.resolve(__dirname, '../assets/brand/cardo-icon-256.png'),
        path.join(outDir, 'app-icon.png'),
      );
    },
  };
}

export default defineConfig({
  define: {
    __CARDO_DEBUG_PACKAGE__: JSON.stringify(process.env.CARDO_DEBUG_PACKAGE === '1'),
    __APP_VERSION__: JSON.stringify(PACKAGE_JSON.version ?? '0.0.0'),
  },
  plugins: [copyDesktopIcons()],
  build: {
    outDir: path.resolve(__dirname, '../artifacts/desktop/main'),
    emptyOutDir: true,
    lib: {
      entry: {
        main: path.resolve(__dirname, '../src/desktop/main.ts'),
        // Detached Runtime child for attach-first embed-if-missing (PR4 / design §6.6.1).
        'runtime-child': path.resolve(__dirname, '../src/desktop/runtimeChild.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'electron',
        'node:child_process',
        'node:crypto',
        'node:fs',
        'node:fs/promises',
        'node:http',
        'node:net',
        'node:os',
        'node:path',
        'node:sqlite',
        'node:url',
        /^node:/,
      ],
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
});
