#!/usr/bin/env node
/**
 * cardo CLI — serve / status / stop / open (detached spawn + browser bootstrap).
 * Design §6.3 / §6.5. Does not implement business Command loops.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  probeRuntimeHealth,
  readDiscoveryFile,
  readLockFile,
  resolveCardoDataPaths,
  startRuntime,
  stopRuntime,
  waitUntilRuntimeStopped,
} from '../runtime/index';
import { defaultOpenLocalResource } from '../runtime/openLocalResourceHook';
import { issueBootstrapCode } from '../client/runtimeClient';

const HELP = `cardo — Cardo local runtime steward

Usage:
  cardo serve              Start Runtime in foreground (lifetime=foreground)
  cardo serve --daemon-child
                           Detached child mode (lifetime=auto; used by open)
  cardo status             Show Runtime health / diagnostics
  cardo stop               Force-stop Runtime via authenticated shutdown
  cardo open               Spawn detached Runtime if needed; open Web with one-time code
  cardo help               Show this help
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'open';

  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      process.stdout.write(HELP);
      return;
    case 'serve':
      await cmdServe(args.slice(1));
      return;
    case 'status':
      await cmdStatus();
      return;
    case 'stop':
      await cmdStop();
      return;
    case 'open':
      await cmdOpen();
      return;
    default:
      process.stderr.write(`Unknown command: ${command}\n\n${HELP}`);
      process.exitCode = 1;
  }
}

async function cmdServe(args: string[]): Promise<void> {
  const daemonChild = args.includes('--daemon-child');
  const lifetimeMode = daemonChild ? 'auto' : 'foreground';
  const paths = resolveCardoDataPaths();
  const serveStaticDir = resolveServeStaticDir();

  if (daemonChild) {
    try {
      fs.mkdirSync(paths.dataDir, { recursive: true });
      fs.appendFileSync(
        paths.logPath,
        `\n[${new Date().toISOString()}] cardo serve --daemon-child starting\n`,
      );
    } catch {
      // ignore log setup failures
    }
  }

  let started;
  try {
    started = await startRuntime({
      startedBy: 'cli',
      lifetimeMode,
      serveStaticDir,
      hooks: {
        openLocalResource: defaultOpenLocalResource,
      },
    });
  } catch (error) {
    const err = error as Error & { code?: string; existing?: { baseUrl: string; pid: number } };
    if (err.code === 'runtime_already_running' && err.existing) {
      const endpoint = err.existing.baseUrl ?? '(starting)';
      process.stderr.write(
        `Runtime already running at ${endpoint} (pid ${err.existing.pid}).\n`,
      );
      process.exitCode = 1;
      return;
    }
    process.stderr.write(
      `Failed to start Runtime: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `Cardo Runtime listening on ${started.baseUrl}\n` +
      `  pid: ${started.pid}\n` +
      `  lifetimeMode: ${started.lifetimeMode}\n` +
      `  dbPath: ${started.dbPath}\n` +
      `  discovery: ${started.discoveryPath}\n` +
      (serveStaticDir ? `  staticUI: ${serveStaticDir}\n` : `  staticUI: (not found; run web-runtime:build)\n`),
  );

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    void stopRuntime();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Block until stopRuntime (signal, HTTP shutdown, or auto grace).
  await waitUntilRuntimeStopped();
}

async function cmdStatus(): Promise<void> {
  const paths = resolveCardoDataPaths();
  const lock = readLockFile(paths.lockPath);
  const discovery = readDiscoveryFile(paths.discoveryPath);

  if (!lock && !discovery) {
    process.stdout.write('Runtime: not running (no lock/discovery)\n');
    process.exitCode = 1;
    return;
  }

  const baseUrl = discovery?.baseUrl ?? lock?.baseUrl;
  if (!baseUrl) {
    process.stdout.write('Runtime: unknown state (corrupt lock/discovery)\n');
    process.exitCode = 1;
    return;
  }

  const healthy = await probeRuntimeHealth(baseUrl);
  if (!healthy) {
    process.stdout.write(
      `Runtime: stale or unreachable at ${baseUrl}\n` +
        `  lock: ${paths.lockPath}\n` +
        `  discovery: ${paths.discoveryPath}\n`,
    );
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`Runtime: running at ${baseUrl}\n`);
  if (lock) {
    process.stdout.write(
      `  pid: ${lock.pid}\n` +
        `  startedBy: ${lock.startedBy}\n` +
        `  lifetimeMode: ${lock.lifetimeMode}\n` +
        `  startedAt: ${lock.startedAt}\n`,
    );
  }

  if (discovery?.token) {
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/diagnostics`, {
        headers: { Authorization: `Bearer ${discovery.token}` },
      });
      if (response.ok) {
        const diag = (await response.json()) as {
          clientCount?: number;
          lifetimeMode?: string;
          revision?: number;
          schemaVersion?: number;
          graceActive?: boolean;
          uptimeMs?: number;
        };
        process.stdout.write(
          `  revision: ${diag.revision}\n` +
            `  schemaVersion: ${diag.schemaVersion}\n` +
            `  clientCount: ${diag.clientCount}\n` +
            `  lifetimeMode: ${diag.lifetimeMode}\n` +
            `  graceActive: ${diag.graceActive}\n` +
            `  uptimeMs: ${diag.uptimeMs}\n`,
        );
      }
    } catch {
      process.stdout.write('  diagnostics: unavailable\n');
    }
  }
}

async function cmdStop(): Promise<void> {
  const paths = resolveCardoDataPaths();
  const discovery = readDiscoveryFile(paths.discoveryPath);
  const lock = readLockFile(paths.lockPath);

  if (!discovery && !lock) {
    process.stdout.write('Runtime is not running.\n');
    return;
  }

  const baseUrl = discovery?.baseUrl ?? lock?.baseUrl;
  const token = discovery?.token;
  const pid = discovery?.pid ?? lock?.pid;

  if (baseUrl && token) {
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/shutdown`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'shutdown' }),
      });
      if (response.ok) {
        // Give the process a moment to clear lock/discovery.
        await new Promise((r) => setTimeout(r, 300));
        process.stdout.write(`Runtime stopped via shutdown at ${baseUrl}\n`);
        return;
      }
      process.stderr.write(`Shutdown HTTP ${response.status}; trying signal...\n`);
    } catch {
      process.stderr.write('Shutdown request failed; trying signal...\n');
    }
  }

  if (pid) {
    try {
      process.kill(pid, 'SIGTERM');
      process.stdout.write(`Sent SIGTERM to pid ${pid}\n`);
      return;
    } catch (error) {
      process.stderr.write(
        `Failed to signal pid ${pid}: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exitCode = 1;
      return;
    }
  }

  process.stderr.write('Could not stop Runtime (no token or pid).\n');
  process.exitCode = 1;
}

/**
 * Ensure Runtime is healthy (spawn detached auto child if needed), then
 * bootstrap one-time code and open system browser to /app/?code=...
 * URL must NOT contain the long-lived process token (design §6.5).
 */
async function cmdOpen(): Promise<void> {
  const paths = resolveCardoDataPaths();
  let discovery = readDiscoveryFile(paths.discoveryPath);
  let healthy = discovery ? await probeRuntimeHealth(discovery.baseUrl) : false;

  if (!healthy) {
    const childEntry = resolveCliEntryPath();
    fs.mkdirSync(paths.dataDir, { recursive: true });
    const logFd = fs.openSync(paths.logPath, 'a');

    try {
      const child = spawn(process.execPath, [childEntry, 'serve', '--daemon-child'], {
        detached: true,
        stdio: ['ignore', logFd, logFd],
        env: { ...process.env },
        windowsHide: true,
      });
      child.unref();
      process.stdout.write(
        `Spawned detached Runtime (pid ${child.pid}); waiting for health...\n`,
      );
    } finally {
      try {
        fs.closeSync(logFd);
      } catch {
        // ignore
      }
    }

    const ready = await waitForRuntime(paths.discoveryPath, 15_000);
    if (!ready) {
      process.stderr.write(
        `Runtime did not become healthy in time. See log: ${paths.logPath}\n`,
      );
      process.exitCode = 1;
      return;
    }
    discovery = readDiscoveryFile(paths.discoveryPath);
    healthy = true;
  }

  if (!discovery?.token || !discovery.baseUrl) {
    process.stderr.write('Runtime discovery is missing baseUrl or token.\n');
    process.exitCode = 1;
    return;
  }

  let oneTimeCode: string;
  try {
    const issued = await issueBootstrapCode(discovery.baseUrl, discovery.token);
    oneTimeCode = issued.oneTimeCode;
  } catch (error) {
    process.stderr.write(
      `auth.bootstrap failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
    return;
  }

  const appUrl = `${discovery.baseUrl.replace(/\/$/, '')}/app/?code=${encodeURIComponent(oneTimeCode)}`;
  process.stdout.write(`Opening ${discovery.baseUrl}/app/ (one-time code bootstrap)\n`);
  openSystemBrowser(appUrl);
}

function openSystemBrowser(url: string): void {
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      // `start` treats first quoted arg as window title; empty title required.
      spawn('cmd', ['/c', 'start', '', url], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      }).unref();
      return;
    }
    if (platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
      return;
    }
    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  } catch (error) {
    process.stderr.write(
      `Failed to open browser: ${error instanceof Error ? error.message : String(error)}\n` +
        `Open manually: ${url}\n`,
    );
    process.exitCode = 1;
  }
}

/**
 * Only accept web-runtime artifacts built with Vite base `/app/`.
 * Do not fall back to desktop renderer (`base: './'`) — those asset URLs break under /app/.
 * serveStaticDir is optional — API still works without UI files.
 */
function resolveServeStaticDir(): string | undefined {
  const candidates = [
    path.resolve(process.cwd(), 'artifacts/web-runtime'),
    // When running from artifacts/cli/cardo.js, also resolve relative to entry.
    (() => {
      try {
        return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../web-runtime');
      } catch {
        return null;
      }
    })(),
  ].filter((value): value is string => Boolean(value));

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) {
      return dir;
    }
  }
  return undefined;
}

function resolveCliEntryPath(): string {
  try {
    const here = fileURLToPath(import.meta.url);
    if (fs.existsSync(here)) {
      return here;
    }
  } catch {
    // ignore
  }
  return path.resolve(process.cwd(), 'artifacts/cli/cardo.js');
}

async function waitForRuntime(
  discoveryPath: string,
  timeoutMs: number,
): Promise<{ baseUrl: string } | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const discovery = readDiscoveryFile(discoveryPath);
    if (discovery) {
      const healthy = await probeRuntimeHealth(discovery.baseUrl);
      if (healthy) return { baseUrl: discovery.baseUrl };
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `cardo fatal: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
