/**
 * Detached Desktop Runtime child (design §6.6 / §6.6.1).
 *
 * Spawned by Desktop Main when no healthy Runtime is discoverable.
 * lifetimeMode=auto so last-client + grace stops the process without killing
 * Desktop UI (and closing Desktop does not kill this process).
 *
 * No electron imports — runs under Electron with ELECTRON_RUN_AS_NODE=1 or Node.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  startRuntime,
  stopRuntime,
  waitUntilRuntimeStopped,
} from '../runtime/index';
import { defaultOpenLocalResource } from '../runtime/openLocalResourceHook';
import { resolveCardoDataPaths } from '../runtime/paths';

async function main(): Promise<void> {
  const paths = resolveCardoDataPaths();
  try {
    fs.mkdirSync(paths.dataDir, { recursive: true });
    fs.appendFileSync(
      paths.logPath,
      `\n[${new Date().toISOString()}] desktop runtime-child starting (pid ${process.pid})\n`,
    );
  } catch {
    // ignore log setup failures
  }

  const serveStaticDir = resolveServeStaticDir();

  try {
    const started = await startRuntime({
      startedBy: 'desktop',
      lifetimeMode: 'auto',
      serveStaticDir,
      hooks: {
        openLocalResource: defaultOpenLocalResource,
      },
    });
    fs.appendFileSync(
      paths.logPath,
      `[${new Date().toISOString()}] desktop runtime-child ready ${started.baseUrl}\n`,
    );
  } catch (error) {
    const err = error as Error & { code?: string; existing?: { baseUrl?: string; pid?: number } };
    const message =
      err.code === 'runtime_already_running'
        ? `Runtime already running at ${err.existing?.baseUrl ?? '(starting)'} (pid ${err.existing?.pid})\n`
        : `Failed to start Runtime: ${error instanceof Error ? error.message : String(error)}\n`;
    try {
      fs.appendFileSync(paths.logPath, `[${new Date().toISOString()}] ${message}`);
    } catch {
      // ignore
    }
    process.stderr.write(message);
    process.exitCode = 1;
    return;
  }

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    void stopRuntime();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await waitUntilRuntimeStopped();
}

/**
 * Optional: serve Runtime-hosted Web UI if web-runtime artifacts exist.
 * Desktop itself loads the local renderer shell; static dir is for other clients.
 */
function resolveServeStaticDir(): string | undefined {
  const candidates: string[] = [];

  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    // artifacts/desktop/main → artifacts/web-runtime
    candidates.push(path.resolve(here, '../../web-runtime'));
    // artifacts/desktop/main → repo artifacts/web-runtime (dev layout)
    candidates.push(path.resolve(here, '../../../artifacts/web-runtime'));
  } catch {
    // ignore
  }

  candidates.push(path.resolve(process.cwd(), 'artifacts/web-runtime'));

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) {
      return dir;
    }
  }
  return undefined;
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `desktop runtime-child fatal: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
