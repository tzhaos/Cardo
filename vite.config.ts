import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

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
      const outDir = options.dir
        ? path.resolve(options.dir)
        : EXTENSION_OUT_DIR;
      const manifestSource = path.resolve(__dirname, 'assets/extension-shell/manifest.json');
      const iconsSource = path.resolve(__dirname, 'assets/extension-shell/icons');
      const localesSource = path.resolve(__dirname, 'assets/extension-shell/_locales');

      fs.mkdirSync(outDir, { recursive: true });
      fs.copyFileSync(manifestSource, path.join(outDir, 'manifest.json'));

      if (fs.existsSync(iconsSource)) {
        fs.cpSync(iconsSource, path.join(outDir, 'extension/icons'), { recursive: true });
      }

      if (fs.existsSync(localesSource)) {
        fs.cpSync(localesSource, path.join(outDir, '_locales'), { recursive: true });
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
