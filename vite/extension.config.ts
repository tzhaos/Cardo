import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import { EXTENSION_LOCALE_CODES, EXTENSION_LOCALE_MESSAGES } from './extension-locales';

const EXTENSION_OUT_DIR = path.resolve(__dirname, '../artifacts/extension/unpacked');
const PACKAGE_JSON = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'),
) as {
  version?: string;
  license?: string;
};

const EXTENSION_PAGE_ENTRIES = [
  {
    sourceRelative: 'assets/extension-shell/pages/app.html',
    targetRelative: 'extension/pages/app.html',
  },
  {
    sourceRelative: 'assets/extension-shell/pages/newtab.html',
    targetRelative: 'extension/pages/newtab.html',
  },
] as const;

function relocateBuiltExtensionPages(outDir: string) {
  for (const page of EXTENSION_PAGE_ENTRIES) {
    const builtSource = path.join(outDir, page.sourceRelative);
    const builtTarget = path.join(outDir, page.targetRelative);

    if (!fs.existsSync(builtSource)) {
      continue;
    }

    fs.mkdirSync(path.dirname(builtTarget), { recursive: true });
    fs.renameSync(builtSource, builtTarget);
  }

  const shellAssetRoot = path.join(outDir, 'assets/extension-shell');

  if (fs.existsSync(shellAssetRoot)) {
    fs.rmSync(shellAssetRoot, { recursive: true, force: true });
  }
}

function copyExtensionAssets() {
  return {
    name: 'copy-extension-assets',
    writeBundle(options: { dir?: string }) {
      const outDir = options.dir ? path.resolve(options.dir) : EXTENSION_OUT_DIR;
      const manifestSource = path.resolve(__dirname, '../assets/extension-shell/manifest.json');
      const backgroundSource = path.resolve(__dirname, '../assets/extension-shell/background.js');
      const iconsSource = path.resolve(__dirname, '../assets/extension-shell/icons');

      fs.mkdirSync(outDir, { recursive: true });
      fs.copyFileSync(manifestSource, path.join(outDir, 'manifest.json'));
      if (fs.existsSync(backgroundSource)) {
        fs.copyFileSync(backgroundSource, path.join(outDir, 'background.js'));
      }

      if (fs.existsSync(iconsSource)) {
        fs.cpSync(iconsSource, path.join(outDir, 'extension/icons'), { recursive: true });
      }

      for (const locale of Object.keys(EXTENSION_LOCALE_MESSAGES) as Array<
        keyof typeof EXTENSION_LOCALE_MESSAGES
      >) {
        const localeDir = path.join(outDir, '_locales', EXTENSION_LOCALE_CODES[locale]);
        fs.mkdirSync(localeDir, { recursive: true });
        fs.writeFileSync(
          path.join(localeDir, 'messages.json'),
          `${JSON.stringify(EXTENSION_LOCALE_MESSAGES[locale], null, 2)}\n`,
          'utf8',
        );
      }
    },
    closeBundle() {
      relocateBuiltExtensionPages(EXTENSION_OUT_DIR);
    },
  };
}

export default defineConfig(() => {
  return {
    define: {
      __APP_VERSION__: JSON.stringify(PACKAGE_JSON.version ?? '0.0.0'),
      __APP_LICENSE__: JSON.stringify(PACKAGE_JSON.license ?? 'MIT'),
    },
    plugins: [react(), tailwindcss(), copyExtensionAssets()],
    optimizeDeps: {
      exclude: ['@sqlite.org/sqlite-wasm'],
    },
    build: {
      outDir: EXTENSION_OUT_DIR,
      rollupOptions: {
        input: {
          app: path.resolve(__dirname, '../assets/extension-shell/pages/app.html'),
          newtab: path.resolve(__dirname, '../assets/extension-shell/pages/newtab.html'),
        },
      },
    },
  };
});
