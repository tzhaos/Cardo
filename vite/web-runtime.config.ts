import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

const OUT_DIR = path.resolve(__dirname, '../artifacts/web-runtime');
const PACKAGE_JSON = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'),
) as {
  version?: string;
  license?: string;
};

/**
 * Vite emits HTML next to the source path (assets/web-runtime/index.html).
 * Runtime serveStatic expects index.html at the static root.
 */
function flattenWebRuntimeHtml() {
  return {
    name: 'flatten-web-runtime-html',
    closeBundle() {
      const nested = path.join(OUT_DIR, 'assets/web-runtime/index.html');
      const target = path.join(OUT_DIR, 'index.html');
      if (!fs.existsSync(nested)) return;
      fs.mkdirSync(OUT_DIR, { recursive: true });
      fs.renameSync(nested, target);
      const nestedDir = path.join(OUT_DIR, 'assets/web-runtime');
      if (fs.existsSync(nestedDir)) {
        fs.rmSync(nestedDir, { recursive: true, force: true });
      }
      // Drop empty assets shell folder if nothing else remains under assets/web-runtime parent path.
      const shellRoot = path.join(OUT_DIR, 'assets');
      // keep shellRoot — built JS/CSS live under assets/*.js
    },
  };
}

/**
 * Static Web UI served by Cardo Runtime at /app/* (design §6.5).
 * Output: artifacts/web-runtime — wired via serveStaticDir in cardo serve / open.
 */
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(PACKAGE_JSON.version ?? '0.0.0'),
    __APP_LICENSE__: JSON.stringify(PACKAGE_JSON.license ?? 'MIT'),
    'import.meta.env.CARDO_USE_RUNTIME': JSON.stringify('1'),
  },
  plugins: [react(), tailwindcss(), flattenWebRuntimeHtml()],
  // Assets and index live under /app so Runtime can map /app/* cleanly.
  base: '/app/',
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, '../assets/web-runtime/index.html'),
      },
    },
  },
});
