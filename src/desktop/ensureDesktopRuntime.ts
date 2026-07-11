/**
 * Desktop attach-first, embed-if-missing (design §6.6 / §6.6.1).
 *
 * 1. discovery + health → attach (no second SQLite write, no second listen)
 * 2. else spawn detached runtime-child (lifetime=auto) and wait for health
 * 3. fallback: in-process startRuntime (same path resolver db) if child entry missing
 *
 * Returns process token + baseUrl for preload injection (never put long-lived token in URL).
 */

import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isRuntimeRunning,
  probeRuntimeHealth,
  readDiscoveryFile,
  resolveCardoDataPaths,
  startRuntime,
  type StartedRuntime,
} from '../runtime/index';
import { defaultOpenLocalResource } from '../runtime/openLocalResourceHook';

export interface DesktopRuntimeConnection {
  baseUrl: string;
  token: string;
  /** How Desktop obtained this Runtime (diagnostics only). */
  mode: 'attach' | 'embed-detached' | 'embed-in-process';
  /** True when this Desktop process hosts Runtime in-process (must not kill on attach-quit). */
  inProcess: boolean;
}

const WAIT_HEALTH_TIMEOUT_MS = 20_000;
const WAIT_HEALTH_POLL_MS = 200;

let inProcessStarted: StartedRuntime | null = null;
let detachedChild: ChildProcess | null = null;

export function getInProcessStartedRuntime(): StartedRuntime | null {
  return inProcessStarted;
}

/**
 * Discover a healthy Runtime or embed one (detached preferred).
 */
export async function ensureDesktopRuntime(options: {
  /** Absolute path to desktop app root (parent of `main/`). */
  desktopAppRoot: string;
}): Promise<DesktopRuntimeConnection> {
  const paths = resolveCardoDataPaths();
  fs.mkdirSync(paths.dataDir, { recursive: true });

  const attached = await tryAttachExisting(paths.discoveryPath);
  if (attached) {
    console.info(`[Cardo] Desktop attach Runtime at ${attached.baseUrl}`);
    return attached;
  }

  const childEntry = resolveRuntimeChildPath(options.desktopAppRoot);
  if (childEntry) {
    console.info(`[Cardo] Desktop embed: spawning detached runtime-child at ${childEntry}`);
    await spawnDetachedRuntimeChild(childEntry, paths.logPath);
    const ready = await waitForHealthyDiscovery(paths.discoveryPath, WAIT_HEALTH_TIMEOUT_MS);
    if (ready) {
      console.info(`[Cardo] Desktop embed-detached Runtime at ${ready.baseUrl}`);
      return {
        baseUrl: ready.baseUrl,
        token: ready.token,
        mode: 'embed-detached',
        inProcess: false,
      };
    }
    console.warn(
      `[Cardo] Detached runtime-child did not become healthy; trying in-process embed. Log: ${paths.logPath}`,
    );
  } else {
    console.warn('[Cardo] runtime-child.js not found; using in-process startRuntime embed');
  }

  // Race: another process may have won the lock while we waited.
  const raceAttach = await tryAttachExisting(paths.discoveryPath);
  if (raceAttach) {
    console.info(`[Cardo] Desktop attach after race at ${raceAttach.baseUrl}`);
    return raceAttach;
  }

  if (isRuntimeRunning()) {
    const info = getInProcessInfoOrThrow();
    return info;
  }

  try {
    inProcessStarted = await startRuntime({
      startedBy: 'desktop',
      lifetimeMode: 'auto',
      serveStaticDir: resolveOptionalServeStaticDir(options.desktopAppRoot),
      hooks: {
        openLocalResource: defaultOpenLocalResource,
      },
    });
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err.code === 'runtime_already_running') {
      const after = await waitForHealthyDiscovery(paths.discoveryPath, WAIT_HEALTH_TIMEOUT_MS);
      if (after) {
        return {
          baseUrl: after.baseUrl,
          token: after.token,
          mode: 'attach',
          inProcess: false,
        };
      }
    }
    throw error;
  }

  console.info(`[Cardo] Desktop embed-in-process Runtime at ${inProcessStarted.baseUrl}`);
  return {
    baseUrl: inProcessStarted.baseUrl,
    token: inProcessStarted.token,
    mode: 'embed-in-process',
    inProcess: true,
  };
}

async function tryAttachExisting(
  discoveryPath: string,
): Promise<DesktopRuntimeConnection | null> {
  const discovery = readDiscoveryFile(discoveryPath);
  if (!discovery?.baseUrl || !discovery.token) {
    return null;
  }
  const healthy = await probeRuntimeHealth(discovery.baseUrl);
  if (!healthy) {
    return null;
  }
  return {
    baseUrl: discovery.baseUrl,
    token: discovery.token,
    mode: 'attach',
    inProcess: false,
  };
}

function getInProcessInfoOrThrow(): DesktopRuntimeConnection {
  if (!inProcessStarted) {
    throw new Error('In-process Runtime is running but connection info is missing.');
  }
  return {
    baseUrl: inProcessStarted.baseUrl,
    token: inProcessStarted.token,
    mode: 'embed-in-process',
    inProcess: true,
  };
}

function resolveRuntimeChildPath(desktopAppRoot: string): string | null {
  const candidates = [
    path.join(desktopAppRoot, 'main', 'runtime-child.js'),
    // When desktopAppRoot is artifacts/desktop
    path.resolve(desktopAppRoot, 'main', 'runtime-child.js'),
  ];

  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    candidates.push(path.join(here, 'runtime-child.js'));
  } catch {
    // ignore
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function resolveOptionalServeStaticDir(desktopAppRoot: string): string | undefined {
  const candidates = [
    path.resolve(desktopAppRoot, '../web-runtime'),
    path.resolve(process.cwd(), 'artifacts/web-runtime'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) {
      return dir;
    }
  }
  return undefined;
}

async function spawnDetachedRuntimeChild(childEntry: string, logPath: string): Promise<void> {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const logFd = fs.openSync(logPath, 'a');

  try {
    // Electron as Node runner so packaged Desktop does not depend on system node.
    const child = spawn(process.execPath, [childEntry], {
      detached: true,
      stdio: ['ignore', logFd, logFd],
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
      },
      windowsHide: true,
    });
    child.unref();
    detachedChild = child;
    console.info(`[Cardo] Spawned runtime-child pid=${child.pid ?? 'unknown'}`);
  } finally {
    try {
      fs.closeSync(logFd);
    } catch {
      // ignore
    }
  }
}

async function waitForHealthyDiscovery(
  discoveryPath: string,
  timeoutMs: number,
): Promise<{ baseUrl: string; token: string } | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const discovery = readDiscoveryFile(discoveryPath);
    if (discovery?.baseUrl && discovery.token) {
      const healthy = await probeRuntimeHealth(discovery.baseUrl);
      if (healthy) {
        return { baseUrl: discovery.baseUrl, token: discovery.token };
      }
    }
    await sleep(WAIT_HEALTH_POLL_MS);
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Authenticated force-stop of the local Runtime (any lifetimeMode).
 * Optional tray action — attach quit must NOT call this.
 */
export async function forceStopDesktopRuntime(connection: DesktopRuntimeConnection): Promise<void> {
  try {
    const response = await fetch(`${connection.baseUrl.replace(/\/$/, '')}/v1/shutdown`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${connection.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'shutdown' }),
    });
    if (!response.ok) {
      console.warn(`[Cardo] Runtime shutdown HTTP ${response.status}`);
    }
  } catch (error) {
    console.warn(
      `[Cardo] Runtime shutdown request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Detached child may already be exiting; clear local refs.
  detachedChild = null;
  inProcessStarted = null;
}
