import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import {
  EXTENSION_LOCALE_CODES,
  EXTENSION_LOCALE_MESSAGES,
} from './src/domains/i18n/model/messages';

const EXTENSION_OUT_DIR = path.resolve(__dirname, 'artifacts/extension/unpacked');

function relocateBuiltNewtab(outDir: string) {
  const builtNewtabSource = path.join(outDir, 'assets/extension-shell/pages/newtab.html');
  const builtNewtabTarget = path.join(outDir, 'extension/pages/newtab.html');

  if (!fs.existsSync(builtNewtabSource)) {
    return;
  }

  fs.mkdirSync(path.dirname(builtNewtabTarget), { recursive: true });
  fs.renameSync(builtNewtabSource, builtNewtabTarget);

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
      const manifestSource = path.resolve(__dirname, 'assets/extension-shell/manifest.json');
      const iconsSource = path.resolve(__dirname, 'assets/extension-shell/icons');

      fs.mkdirSync(outDir, { recursive: true });
      fs.copyFileSync(manifestSource, path.join(outDir, 'manifest.json'));

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
      relocateBuiltNewtab(EXTENSION_OUT_DIR);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), copyExtensionAssets()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: EXTENSION_OUT_DIR,
      rollupOptions: {
        input: {
          newtab: path.resolve(__dirname, 'assets/extension-shell/pages/newtab.html'),
        },
      },
    },
  };
});
