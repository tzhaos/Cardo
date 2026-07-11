/**
 * Desktop attach-first, embed-if-missing (design §6.6 / §6.6.1).
 *
 * 1. discovery + health + compatible schema + /app UI → attach
 * 2. else if existing Runtime is incompatible (old schema / no static UI) → force-stop, then embed
 * 3. else spawn detached runtime-child (lifetime=auto) and wait for health
 * 4. No in-process startRuntime fallback — Main must not host Runtime
 *
 * Returns process token + baseUrl for preload injection (never put long-lived token in URL).
 * Caller should load UI from `${baseUrl}/app/` (same-origin RuntimeClient; design §6.4.2).
 */

import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATABASE_SCHEMA_VERSION } from '../core/database/version';
import {
  probeRuntimeHealth,
  readDiscoveryFile,
  resolveCardoDataPaths,
} from '../runtime/index';

export interface DesktopRuntimeConnection {
  baseUrl: string;
  token: string;
  /** How Desktop obtained this Runtime (diagnostics only). */
  mode: 'attach' | 'embed-detached';
}

const WAIT_HEALTH_TIMEOUT_MS = 20_000;
const WAIT_HEALTH_POLL_MS = 200;
const STATIC_PROBE_TIMEOUT_MS = 2_000;
const WAIT_SHUTDOWN_TIMEOUT_MS = 8_000;

let detachedChild: ChildProcess | null = null;
let detachedChildExited = false;
let detachedChildExitCode: number | null = null;

/**
 * Discover a healthy Runtime or embed a detached one.
 * Never starts Runtime inside the Electron Main process.
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

  // Incompatible or half-built Runtime holding the lock (old schema / no /app UI).
  await retireIncompatibleRuntime(paths.discoveryPath);

  const childEntry = resolveRuntimeChildPath(options.desktopAppRoot);
  if (!childEntry) {
    throw new Error(
      'Desktop Runtime child entry missing (main/runtime-child.js). Run `npm run desktop:build`.',
    );
  }

  console.info(`[Cardo] Desktop embed: spawning detached runtime-child at ${childEntry}`);
  await spawnDetachedRuntimeChild(childEntry, paths.logPath);

  const ready = await waitForHealthyDiscovery(paths.discoveryPath, WAIT_HEALTH_TIMEOUT_MS);
  if (ready) {
    const ok = await runtimeServesAppUi(ready.baseUrl);
    if (!ok) {
      throw new Error(
        `Desktop Runtime started at ${ready.baseUrl} but does not serve /app UI. ` +
          'Run `npm run desktop:build` (includes web-runtime) and restart Desktop.',
      );
    }
    console.info(`[Cardo] Desktop embed-detached Runtime at ${ready.baseUrl}`);
    return {
      baseUrl: ready.baseUrl,
      token: ready.token,
      mode: 'embed-detached',
    };
  }

  // Another process may have won the lock while our child failed or exited.
  const raceAttach = await tryAttachExisting(paths.discoveryPath);
  if (raceAttach) {
    console.info(`[Cardo] Desktop attach after race at ${raceAttach.baseUrl}`);
    return raceAttach;
  }

  const exitHint = detachedChildExited
    ? ` runtime-child exited (code=${detachedChildExitCode ?? 'unknown'}).`
    : '';
  throw new Error(
    `Desktop could not attach or start Runtime within ${WAIT_HEALTH_TIMEOUT_MS}ms.${exitHint} ` +
      `See log: ${paths.logPath}. If a stale Runtime holds the lock, run \`cardo stop\` then retry.`,
  );
}

/**
 * Attach only when Runtime is healthy, schema-compatible with this Desktop, and serves /app UI.
 * Stale CLI/Desktop Runtimes from older builds are not attachable (prevents prefs Zod / blank UI).
 */
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
  if (discovery.schemaVersion < DATABASE_SCHEMA_VERSION) {
    console.warn(
      `[Cardo] Runtime schema ${discovery.schemaVersion} < required ${DATABASE_SCHEMA_VERSION}; not attaching`,
    );
    return null;
  }
  if (!(await runtimeServesAppUi(discovery.baseUrl))) {
    console.warn(`[Cardo] Runtime at ${discovery.baseUrl} has no /app UI; not attaching`);
    return null;
  }
  return {
    baseUrl: discovery.baseUrl,
    token: discovery.token,
    mode: 'attach',
  };
}

/**
 * Stop a running Runtime that blocks embed but is unusable by this Desktop build.
 */
async function retireIncompatibleRuntime(discoveryPath: string): Promise<void> {
  const discovery = readDiscoveryFile(discoveryPath);
  if (!discovery?.baseUrl || !discovery.token) {
    return;
  }
  const healthy = await probeRuntimeHealth(discovery.baseUrl);
  if (!healthy) {
    return;
  }
  const schemaOk = discovery.schemaVersion >= DATABASE_SCHEMA_VERSION;
  const uiOk = await runtimeServesAppUi(discovery.baseUrl);
  if (schemaOk && uiOk) {
    return;
  }

  console.warn(
    `[Cardo] Retiring incompatible Runtime at ${discovery.baseUrl} ` +
      `(schema=${discovery.schemaVersion}, appUi=${uiOk})`,
  );
  await requestRuntimeShutdown(discovery.baseUrl, discovery.token);
  await waitForRuntimeGone(discoveryPath, discovery.baseUrl, WAIT_SHUTDOWN_TIMEOUT_MS);
}

async function requestRuntimeShutdown(baseUrl: string, token: string): Promise<void> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/shutdown`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'shutdown' }),
    });
    if (!response.ok) {
      console.warn(`[Cardo] Runtime shutdown HTTP ${response.status}`);
    }
  } catch (error) {
    console.warn(
      `[Cardo] Runtime shutdown request failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

async function waitForRuntimeGone(
  discoveryPath: string,
  baseUrl: string,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const stillHealthy = await probeRuntimeHealth(baseUrl);
    const discovery = readDiscoveryFile(discoveryPath);
    if (!stillHealthy && (!discovery || discovery.baseUrl !== baseUrl)) {
      return;
    }
    await sleep(WAIT_HEALTH_POLL_MS);
  }
  console.warn(`[Cardo] Timed out waiting for Runtime shutdown at ${baseUrl}`);
}

function resolveRuntimeChildPath(desktopAppRoot: string): string | null {
  const candidates = [
    path.join(desktopAppRoot, 'main', 'runtime-child.js'),
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

async function runtimeServesAppUi(baseUrl: string): Promise<boolean> {
  const url = `${baseUrl.replace(/\/$/, '')}/app/`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), STATIC_PROBE_TIMEOUT_MS);
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timer);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Runtime-hosted Web UI is required for same-origin Desktop RuntimeClient
 * (design §6.4.2 / §6.5). Desktop loads baseUrl/app/ — not file://.
 */
export async function assertRuntimeServesAppUi(baseUrl: string): Promise<void> {
  if (await runtimeServesAppUi(baseUrl)) {
    return;
  }
  throw new Error(
    `Runtime at ${baseUrl} is healthy but does not serve /app/ UI. ` +
      'Build with `npm run desktop:build` (or `npm run cardo:build`) and restart Desktop / `cardo serve`. ' +
      'If an older Runtime is still running, run `cardo stop` first.',
  );
}

async function spawnDetachedRuntimeChild(childEntry: string, logPath: string): Promise<void> {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const logFd = fs.openSync(logPath, 'a');
  detachedChildExited = false;
  detachedChildExitCode = null;

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
    child.once('exit', (code) => {
      detachedChildExited = true;
      detachedChildExitCode = code;
      if (detachedChild === child) {
        detachedChild = null;
      }
      console.warn(
        `[Cardo] runtime-child exited code=${code ?? 'null'} (pid was ${child.pid ?? 'unknown'})`,
      );
    });
    child.once('error', (error) => {
      detachedChildExited = true;
      console.error(
        `[Cardo] runtime-child spawn error: ${error instanceof Error ? error.message : String(error)}`,
      );
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
    // Abort early if our child already died without producing a healthy Runtime.
    if (detachedChildExited) {
      const discovery = readDiscoveryFile(discoveryPath);
      if (discovery?.baseUrl && discovery.token) {
        const healthy = await probeRuntimeHealth(discovery.baseUrl);
        if (healthy) {
          return { baseUrl: discovery.baseUrl, token: discovery.token };
        }
      }
      return null;
    }

    const discovery = readDiscoveryFile(discoveryPath);
    if (discovery?.baseUrl && discovery.token) {
      const healthy = await probeRuntimeHealth(discovery.baseUrl);
      if (healthy && discovery.schemaVersion >= DATABASE_SCHEMA_VERSION) {
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
  await requestRuntimeShutdown(connection.baseUrl, connection.token);
  detachedChild = null;
}
