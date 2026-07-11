import path from 'node:path';
import { defineConfig } from 'vite';

/**
 * Native Messaging host is packaged as a Node SEA (single executable).
 * SEA only resolves Node built-ins — all npm deps (e.g. zod) MUST be bundled
 * into host.cjs. Leaving `require("zod")` causes:
 *   ERR_UNKNOWN_BUILTIN_MODULE: No such built-in module: zod
 * and Chrome reports "Could not talk to the native messaging host".
 */
export default defineConfig({
  ssr: {
    // Bundle every non-node dependency into the SEA payload.
    noExternal: true,
  },
  build: {
    outDir: path.resolve(__dirname, '../artifacts/native-host'),
    emptyOutDir: true,
    ssr: path.resolve(__dirname, '../src/native-host/main.ts'),
    target: 'node22',
    commonjsOptions: {
      include: [/node_modules/],
    },
    rollupOptions: {
      external: [/^node:/],
      output: {
        format: 'cjs',
        entryFileNames: 'host.cjs',
        // Single file SEA blob: no code-split chunks.
        inlineDynamicImports: true,
      },
    },
  },
});
