import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

function copyExtensionAssets() {
  return {
    name: 'copy-extension-assets',
    writeBundle(options: { dir?: string }) {
      const outDir = options.dir ? path.resolve(options.dir) : path.resolve(__dirname, 'dist');
      const manifestSource = path.resolve(__dirname, 'extension/manifest.json');
      const iconsSource = path.resolve(__dirname, 'extension/icons');
      const localesSource = path.resolve(__dirname, 'extension/_locales');

      fs.mkdirSync(outDir, { recursive: true });
      fs.copyFileSync(manifestSource, path.join(outDir, 'manifest.json'));

      if (fs.existsSync(iconsSource)) {
        fs.cpSync(iconsSource, path.join(outDir, 'extension/icons'), { recursive: true });
      }

      if (fs.existsSync(localesSource)) {
        fs.cpSync(localesSource, path.join(outDir, '_locales'), { recursive: true });
      }
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
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        input: {
          preview: path.resolve(__dirname, 'index.html'),
          newtab: path.resolve(__dirname, 'extension/pages/newtab.html'),
        },
      },
    },
  };
});
