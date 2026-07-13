/**
 * Cardo Runtime library entry: startRuntime / stopRuntime.
 * No electron imports — usable from CLI and Desktop Main (PR4).
 */

import type http from 'node:http';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { RuntimeAuth } from './auth';
import { ClientRegistry } from './clients';
import { CommandQueue } from './commandQueue';
import { buildRuntimeHostConfig, type RuntimeHostConfig, type StartRuntimeOptions } from './config';
import { openRuntimeDatabase, type RuntimeDatabaseHandle } from './database';
import { removeDiscoveryFile, writeDiscoveryFile } from './discovery';
import { EventHub } from './events';
import { createRuntimeHttpServer, type RuntimeHttpContext } from './httpServer';
import { removeLockFile, tryAcquireExclusiveLock, updateLockFile, type RuntimeLock } from './lock';
import { runtimeLog, setRuntimeLogPath } from './log';
import { CARDO_THEMES_DIRNAME, ensureDataDir, ensureThemesDir } from './paths';
import { getRevision } from '../core/database/revision';
import { DATABASE_SCHEMA_VERSION } from '../core/database/version';

export type { StartRuntimeOptions, RuntimeHostConfig } from './config';
export { resolveCardoDataPaths, resolveDefaultDataDir, CARDO_USER_DATA_DIR_NAME } from './paths';
export { readDiscoveryFile } from './discovery';
export { readLockFile, probeRuntimeHealth } from './lock';
export { runtimeLog, setRuntimeLogPath, type RuntimeLogLevel } from './log';

export interface StartedRuntime {
  baseUrl: string;
  port: number;
  pid: number;
  token: string;
  lifetimeMode: 'foreground' | 'auto';
  startedBy: 'cli' | 'desktop';
  dbPath: string;
  discoveryPath: string;
  lockPath: string;
}

interface RuntimeState {
  config: RuntimeHostConfig;
  auth: RuntimeAuth;
  db: RuntimeDatabaseHandle;
  server: http.Server;
  events: EventHub;
  clients: ClientRegistry;
  queue: CommandQueue;
  startedAtMs: number;
  baseUrl: string;
  port: number;
  stopping: boolean;
}

let runtimeState: RuntimeState | null = null;
let runtimeStoppedWaiters: Array<() => void> = [];
let processHandlersRegistered = false;
let fatalHandling = false;

/** Resolves when the in-process Runtime has fully stopped (or immediately if not running). */
export function waitUntilRuntimeStopped(): Promise<void> {
  if (!runtimeState) return Promise.resolve();
  return new Promise((resolve) => {
    runtimeStoppedWaiters.push(resolve);
  });
}

function notifyRuntimeStopped(): void {
  const waiters = runtimeStoppedWaiters;
  runtimeStoppedWaiters = [];
  for (const resolve of waiters) resolve();
}

/**
 * Register once: unhandledRejection + uncaughtException → structured log,
 * best-effort stopRuntime / lock+discovery cleanup if this process owns them, then exit(1).
 * Safe to call from CLI serve / runtime-child before startRuntime.
 */
export function registerRuntimeProcessHandlers(): void {
  if (processHandlersRegistered) {
    return;
  }
  processHandlersRegistered = true;

  process.on('unhandledRejection', (reason) => {
    void handleRuntimeFatal('unhandled_rejection', reason);
  });
  process.on('uncaughtException', (error) => {
    void handleRuntimeFatal('uncaught_exception', error);
  });
}

async function handleRuntimeFatal(event: string, reason: unknown): Promise<void> {
  if (fatalHandling) {
    return;
  }
  fatalHandling = true;

  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  runtimeLog('error', event, {
    pid: process.pid,
    message,
    stack,
    code: 'fatal',
    port: runtimeState?.port,
  });

  const owned = runtimeState;
  if (owned) {
    try {
      await Promise.race([
        stopRuntime(),
        new Promise<void>((resolve) => {
          setTimeout(resolve, 2_000);
        }),
      ]);
    } catch (cleanupError) {
      runtimeLog('error', 'fatal_stop_failed', {
        pid: process.pid,
        message: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
      });
    }

    // Last-ditch: if stop did not clear ownership, drop lock/discovery for this process.
    if (runtimeState) {
      try {
        removeLockFile(owned.config.lockPath);
        removeDiscoveryFile(owned.config.discoveryPath);
        runtimeLog('warn', 'fatal_force_cleanup', {
          pid: process.pid,
          port: owned.port,
        });
      } catch {
        // ignore
      }
    }
  }

  process.exit(1);
}

export function isRuntimeRunning(): boolean {
  return runtimeState != null && !runtimeState.stopping;
}

export function getStartedRuntimeInfo(): StartedRuntime | null {
  if (!runtimeState) return null;
  return {
    baseUrl: runtimeState.baseUrl,
    port: runtimeState.port,
    pid: process.pid,
    token: runtimeState.auth.getProcessToken(),
    lifetimeMode: runtimeState.config.lifetimeMode,
    startedBy: runtimeState.config.startedBy,
    dbPath: runtimeState.config.dbPath,
    discoveryPath: runtimeState.config.discoveryPath,
    lockPath: runtimeState.config.lockPath,
  };
}

/**
 * Start the Cardo Runtime HTTP server with exclusive lock + discovery.
 * Rejects if another live Runtime holds the lock.
 *
 * Lock order: exclusive status=starting → open DB → listen → promote lock to ready + write discovery.
 * Never publishes a probeable-but-wrong baseUrl (avoids health-fail lock steal).
 */
export async function startRuntime(options: StartRuntimeOptions): Promise<StartedRuntime> {
  if (runtimeState) {
    throw new Error('Runtime is already started in this process.');
  }

  // Default openLocalResource is no-op; CLI/Desktop inject host capability hooks.
  const config = buildRuntimeHostConfig(options);

  setRuntimeLogPath(config.logPath);
  registerRuntimeProcessHandlers();

  ensureDataDir(config.dataDir);
  // Ensure user theme drop folder exists for Desktop/CLI Theme Pack files.
  ensureThemesDir(path.join(config.dataDir, CARDO_THEMES_DIRNAME));

  runtimeLog('info', 'runtime_starting', {
    pid: process.pid,
    startedBy: config.startedBy,
    lifetimeMode: config.lifetimeMode,
  });

  const auth = new RuntimeAuth(config.token);
  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();

  // Exclusive claim only — no fake port/baseUrl while starting.
  const startingLock: RuntimeLock = {
    pid: process.pid,
    startedBy: config.startedBy,
    lifetimeMode: config.lifetimeMode,
    startedAt,
    status: 'starting',
  };

  const acquire = await tryAcquireExclusiveLock({
    lockPath: config.lockPath,
    discoveryPath: config.discoveryPath,
    lock: startingLock,
  });

  if (!acquire.ok) {
    if (acquire.reason === 'held_by_live_runtime' && acquire.existing) {
      const err = new Error(acquire.message) as Error & {
        code: string;
        existing: RuntimeLock;
      };
      err.code = 'runtime_already_running';
      err.existing = acquire.existing;
      throw err;
    }
    throw new Error(acquire.message);
  }

  let db: RuntimeDatabaseHandle;
  try {
    db = openRuntimeDatabase(config.dbPath);
  } catch (error) {
    removeLockFile(config.lockPath);
    removeDiscoveryFile(config.discoveryPath);
    throw error;
  }

  const events = new EventHub();
  const queue = new CommandQueue();
  const metrics = {
    corsRejectedCount: 0,
    authFailCount: 0,
    lastMutationAt: null as string | null,
  };

  let port = 0;
  let baseUrl = '';

  const clients = new ClientRegistry({
    lifetimeMode: config.lifetimeMode,
    clientGraceMs: config.clientGraceMs,
    onGraceStop: () => {
      void stopRuntime();
    },
  });

  const ctx: RuntimeHttpContext = {
    config,
    auth,
    queue,
    events,
    clients,
    database: db.database,
    dbPath: config.dbPath,
    startedAtMs,
    getPort: () => port,
    getBaseUrl: () => baseUrl,
    onShutdown: () => {
      void stopRuntime();
    },
    metrics,
  };

  const server = createRuntimeHttpServer(ctx);

  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(config.port && config.port > 0 ? config.port : 0, '127.0.0.1', () => {
        server.off('error', reject);
        resolve();
      });
    });
  } catch (error) {
    db.close();
    removeLockFile(config.lockPath);
    removeDiscoveryFile(config.discoveryPath);
    throw error;
  }

  const address = server.address() as AddressInfo;
  port = address.port;
  baseUrl = `http://127.0.0.1:${port}`;

  let revision = 0;
  try {
    revision = await getRevision(db.database);
  } catch {
    revision = 0;
  }

  const readyLock: RuntimeLock = {
    pid: process.pid,
    baseUrl,
    port,
    startedBy: config.startedBy,
    lifetimeMode: config.lifetimeMode,
    startedAt,
    status: 'ready',
  };
  updateLockFile(config.lockPath, readyLock);
  writeDiscoveryFile(config.discoveryPath, {
    baseUrl,
    port,
    pid: process.pid,
    token: auth.getProcessToken(),
    startedBy: config.startedBy,
    lifetimeMode: config.lifetimeMode,
    startedAt,
    schemaVersion: DATABASE_SCHEMA_VERSION,
    revision,
  });

  // Detached auto Runtime with zero clients must still grace-stop (design §6.6.1 / PR2 exit).
  if (config.lifetimeMode === 'auto') {
    clients.startGraceIfEmpty();
  }

  runtimeState = {
    config,
    auth,
    db,
    server,
    events,
    clients,
    queue,
    startedAtMs,
    baseUrl,
    port,
    stopping: false,
  };

  runtimeLog('info', 'runtime_started', {
    pid: process.pid,
    port,
    startedBy: config.startedBy,
    lifetimeMode: config.lifetimeMode,
  });

  return {
    baseUrl,
    port,
    pid: process.pid,
    token: auth.getProcessToken(),
    lifetimeMode: config.lifetimeMode,
    startedBy: config.startedBy,
    dbPath: config.dbPath,
    discoveryPath: config.discoveryPath,
    lockPath: config.lockPath,
  };
}

/**
 * Stop Runtime: close SSE, HTTP, DB; clear lock + discovery.
 * Safe to call when not running (no-op).
 */
export async function stopRuntime(): Promise<void> {
  const state = runtimeState;
  if (!state || state.stopping) return;
  state.stopping = true;

  runtimeLog('info', 'runtime_stopping', {
    pid: process.pid,
    port: state.port,
    startedBy: state.config.startedBy,
    lifetimeMode: state.config.lifetimeMode,
  });

  state.clients.cancelGrace();
  state.events.closeAll();
  state.clients.dispose();

  await new Promise<void>((resolve) => {
    state.server.close(() => resolve());
    const serverWithCloseAll = state.server as http.Server & {
      closeAllConnections?: () => void;
    };
    serverWithCloseAll.closeAllConnections?.();
  });

  state.db.close();
  removeLockFile(state.config.lockPath);
  removeDiscoveryFile(state.config.discoveryPath);

  runtimeState = null;
  notifyRuntimeStopped();

  runtimeLog('info', 'runtime_stopped', {
    pid: process.pid,
    port: state.port,
  });
}
