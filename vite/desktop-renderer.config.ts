import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
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
