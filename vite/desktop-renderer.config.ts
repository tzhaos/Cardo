import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

const PACKAGE_JSON = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'),
) as {
  version?: string;
  license?: string;
};

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(PACKAGE_JSON.version ?? '0.0.0'),
    __APP_LICENSE__: JSON.stringify(PACKAGE_JSON.license ?? 'MIT'),
  },
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    outDir: path.resolve(__dirname, '../artifacts/desktop/renderer'),
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, '../assets/desktop-shell/index.html'),
      },
    },
  },
});
