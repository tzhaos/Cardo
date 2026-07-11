/**
 * Exclusive runtime lockfile (design §6.14).
 * Contents: pid, status, baseUrl/port (when ready), startedBy, lifetimeMode, startedAt — NEVER token.
 *
 * Startup protocol: write status=starting (no probeable baseUrl), then open DB + listen,
 * then update to status=ready with the real baseUrl. Stale recovery must not treat a
 * young starting lock with a live pid as free (avoids provisional port health-fail steal).
 */

import fs from 'node:fs';
import { z } from 'zod';

/** Max time a status=starting lock is treated as held while its pid is alive. */
export const LOCK_STARTUP_GRACE_MS = 30_000;

export const runtimeLockSchema = z
  .object({
    pid: z.number().int().positive(),
    /** Present when status is ready (real listen address). Omitted while starting. */
    baseUrl: z.string().min(1).optional(),
    port: z.number().int().positive().optional(),
    startedBy: z.enum(['cli', 'desktop']),
    lifetimeMode: z.enum(['foreground', 'auto']),
    startedAt: z.string().min(1),
    /** starting: exclusive claim before listen; ready: health probeable. Default ready for older files. */
    status: z.enum(['starting', 'ready']).default('ready'),
  })
  .strict();

export type RuntimeLock = z.infer<typeof runtimeLockSchema>;

export type AcquireLockResult =
  | { ok: true; lock: RuntimeLock }
  | {
      ok: false;
      reason: 'held_by_live_runtime' | 'stale_cleaned_retry' | 'io_error';
      existing?: RuntimeLock;
      message: string;
    };

const HEALTH_PROBE_TIMEOUT_MS = 800;
const HEALTH_PROBE_ATTEMPTS = 3;
const HEALTH_PROBE_GAP_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function readLockFile(lockPath: string): RuntimeLock | null {
  try {
    if (!fs.existsSync(lockPath)) return null;
    const raw = JSON.parse(fs.readFileSync(lockPath, 'utf8')) as unknown;
    const parsed = runtimeLockSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeLockFile(lockPath: string, lock: RuntimeLock): void {
  const payload = `${JSON.stringify(runtimeLockSchema.parse(lock), null, 2)}\n`;
  const tmp = `${lockPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, payload, { encoding: 'utf8', flag: 'w' });
  fs.renameSync(tmp, lockPath);
}

export function removeLockFile(lockPath: string): void {
  try {
    fs.unlinkSync(lockPath);
  } catch {
    // ignore missing
  }
}

export async function probeRuntimeHealth(baseUrl: string): Promise<boolean> {
  for (let attempt = 0; attempt < HEALTH_PROBE_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), HEALTH_PROBE_TIMEOUT_MS);
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (response.ok) {
        const body = (await response.json()) as { ok?: boolean };
        if (body.ok === true) return true;
      }
    } catch {
      // try again
    }
    if (attempt + 1 < HEALTH_PROBE_ATTEMPTS) {
      await sleep(HEALTH_PROBE_GAP_MS);
    }
  }
  return false;
}

export function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function lockAgeMs(lock: RuntimeLock): number {
  const started = Date.parse(lock.startedAt);
  if (Number.isNaN(started)) return Number.POSITIVE_INFINITY;
  return Date.now() - started;
}

/**
 * Decide whether an existing lock still represents a live Runtime claim.
 * - ready + health ok → held
 * - starting + pid alive within startup grace → held (never health-fail steal)
 * - otherwise → stale (caller may clean)
 */
export async function isLockHeldByLiveRuntime(
  lock: RuntimeLock,
): Promise<{ held: true; message: string } | { held: false }> {
  if (lock.status === 'starting') {
    if (isPidAlive(lock.pid) && lockAgeMs(lock) < LOCK_STARTUP_GRACE_MS) {
      return {
        held: true,
        message: `Runtime is starting (pid ${lock.pid}); lock not stealable until ready or startup grace expires.`,
      };
    }
    // Stuck starting (dead pid or grace expired) → stale.
    return { held: false };
  }

  // ready: prefer health over pid (Windows PID reuse; design §6.14).
  if (lock.baseUrl) {
    const healthy = await probeRuntimeHealth(lock.baseUrl);
    if (healthy) {
      return {
        held: true,
        message: `Runtime already running at ${lock.baseUrl} (pid ${lock.pid}).`,
      };
    }
  }

  // ready but health fail: if pid is alive and lock is extremely young, wait —
  // covers the brief window after ready write before accept loop is up.
  if (isPidAlive(lock.pid) && lockAgeMs(lock) < 2_000 && lock.baseUrl) {
    const healthyRetry = await probeRuntimeHealth(lock.baseUrl);
    if (healthyRetry) {
      return {
        held: true,
        message: `Runtime already running at ${lock.baseUrl} (pid ${lock.pid}).`,
      };
    }
  }

  return { held: false };
}

/**
 * Try to create exclusive lock with status=starting (no fake baseUrl).
 * If lock exists: health/starting resolution; stale → delete lock+discovery and retry once.
 */
export async function tryAcquireExclusiveLock(options: {
  lockPath: string;
  discoveryPath: string;
  lock: RuntimeLock;
}): Promise<AcquireLockResult> {
  const { lockPath, discoveryPath, lock } = options;
  const startingLock = runtimeLockSchema.parse({
    ...lock,
    status: 'starting',
    baseUrl: undefined,
    port: undefined,
  });

  try {
    const fd = fs.openSync(lockPath, 'wx');
    try {
      fs.writeFileSync(fd, `${JSON.stringify(startingLock, null, 2)}\n`, 'utf8');
    } finally {
      fs.closeSync(fd);
    }
    return { ok: true, lock: startingLock };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'EEXIST') {
      return {
        ok: false,
        reason: 'io_error',
        message: error instanceof Error ? error.message : 'Failed to create lock file.',
      };
    }
  }

  const existing = readLockFile(lockPath);
  if (existing) {
    const live = await isLockHeldByLiveRuntime(existing);
    if (live.held) {
      return {
        ok: false,
        reason: 'held_by_live_runtime',
        existing,
        message: live.message,
      };
    }
  }

  // Stale: clean lock + discovery, then retry exclusive create once.
  removeLockFile(lockPath);
  try {
    fs.unlinkSync(discoveryPath);
  } catch {
    // ignore
  }

  try {
    const fd = fs.openSync(lockPath, 'wx');
    try {
      fs.writeFileSync(fd, `${JSON.stringify(startingLock, null, 2)}\n`, 'utf8');
    } finally {
      fs.closeSync(fd);
    }
    return { ok: true, lock: startingLock };
  } catch (error) {
    const existingAfter = readLockFile(lockPath);
    if (existingAfter) {
      const live = await isLockHeldByLiveRuntime(existingAfter);
      if (live.held) {
        return {
          ok: false,
          reason: 'held_by_live_runtime',
          existing: existingAfter,
          message: live.message,
        };
      }
    }
    return {
      ok: false,
      reason: 'io_error',
      message: error instanceof Error ? error.message : 'Failed to acquire lock after stale cleanup.',
    };
  }
}

/** Promote starting lock to ready with real baseUrl/port after listen. */
export function updateLockFile(lockPath: string, lock: RuntimeLock): void {
  writeLockFile(lockPath, runtimeLockSchema.parse(lock));
}

export function describeLockConflict(existing: RuntimeLock): string {
  const pidHint = isPidAlive(existing.pid) ? 'pid alive' : 'pid not responding';
  const endpoint = existing.baseUrl ?? '(starting)';
  return `Runtime held by pid ${existing.pid} at ${endpoint} (${pidHint}, status=${existing.status}, startedBy=${existing.startedBy}).`;
}
