/**
 * Exclusive runtime lockfile (design §6.14).
 * Contents: pid, baseUrl, port, startedBy, lifetimeMode, startedAt — NEVER token.
 */

import fs from 'node:fs';
import { z } from 'zod';

export const runtimeLockSchema = z
  .object({
    pid: z.number().int().positive(),
    baseUrl: z.string().min(1),
    port: z.number().int().positive(),
    startedBy: z.enum(['cli', 'desktop']),
    lifetimeMode: z.enum(['foreground', 'auto']),
    startedAt: z.string().min(1),
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
  // Atomic-ish replace on same volume: write temp then rename.
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

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Try to create exclusive lock. If lock exists:
 * - health ok → fail held_by_live_runtime
 * - health fail (stale, including PID reuse) → delete lock + discovery and report stale_cleaned_retry
 */
export async function tryAcquireExclusiveLock(options: {
  lockPath: string;
  discoveryPath: string;
  lock: RuntimeLock;
}): Promise<AcquireLockResult> {
  const { lockPath, discoveryPath, lock } = options;

  // Exclusive create first.
  try {
    const fd = fs.openSync(lockPath, 'wx');
    try {
      fs.writeFileSync(fd, `${JSON.stringify(runtimeLockSchema.parse(lock), null, 2)}\n`, 'utf8');
    } finally {
      fs.closeSync(fd);
    }
    return { ok: true, lock };
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
    const healthy = await probeRuntimeHealth(existing.baseUrl);
    if (healthy) {
      return {
        ok: false,
        reason: 'held_by_live_runtime',
        existing,
        message: `Runtime already running at ${existing.baseUrl} (pid ${existing.pid}).`,
      };
    }
  }

  // Stale: health failed (prefer health over pid; design §6.14).
  removeLockFile(lockPath);
  try {
    fs.unlinkSync(discoveryPath);
  } catch {
    // ignore
  }

  // Retry exclusive create once after cleanup.
  try {
    const fd = fs.openSync(lockPath, 'wx');
    try {
      fs.writeFileSync(fd, `${JSON.stringify(runtimeLockSchema.parse(lock), null, 2)}\n`, 'utf8');
    } finally {
      fs.closeSync(fd);
    }
    return { ok: true, lock };
  } catch (error) {
    const existingAfter = readLockFile(lockPath);
    if (existingAfter) {
      const healthy = await probeRuntimeHealth(existingAfter.baseUrl);
      if (healthy) {
        return {
          ok: false,
          reason: 'held_by_live_runtime',
          existing: existingAfter,
          message: `Runtime already running at ${existingAfter.baseUrl} (pid ${existingAfter.pid}).`,
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

/** Update lock after bind (port/baseUrl known). */
export function updateLockFile(lockPath: string, lock: RuntimeLock): void {
  writeLockFile(lockPath, lock);
}

export function describeLockConflict(existing: RuntimeLock): string {
  const pidHint = isPidAlive(existing.pid) ? 'pid alive' : 'pid not responding';
  return `Runtime held by pid ${existing.pid} at ${existing.baseUrl} (${pidHint}, startedBy=${existing.startedBy}).`;
}
