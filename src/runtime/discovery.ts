/**
 * Discovery file — sole secrets file (design §6.14 / §9).
 * Contains process token; lockfile must never hold the token.
 */

import fs from 'node:fs';
import { z } from 'zod';

export const runtimeDiscoverySchema = z
  .object({
    baseUrl: z.string().min(1),
    port: z.number().int().positive(),
    pid: z.number().int().positive(),
    token: z.string().min(32),
    startedBy: z.enum(['cli', 'desktop']),
    lifetimeMode: z.enum(['foreground', 'auto']),
    startedAt: z.string().min(1),
    schemaVersion: z.number().int().positive(),
    /** Snapshot of runtime_meta.revision at discovery write / last update (no SQLite on read). */
    revision: z.number().int().nonnegative(),
  })
  .strict();

export type RuntimeDiscovery = z.infer<typeof runtimeDiscoverySchema>;

export function readDiscoveryFile(discoveryPath: string): RuntimeDiscovery | null {
  try {
    if (!fs.existsSync(discoveryPath)) return null;
    const raw = JSON.parse(fs.readFileSync(discoveryPath, 'utf8')) as unknown;
    const parsed = runtimeDiscoverySchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Write discovery JSON and tighten permissions when the platform allows.
 * POSIX: mode 0o600. Windows: best-effort; Node cannot set full ACL without extra APIs.
 */
export function writeDiscoveryFile(discoveryPath: string, discovery: RuntimeDiscovery): void {
  const payload = `${JSON.stringify(runtimeDiscoverySchema.parse(discovery), null, 2)}\n`;
  const tmp = `${discoveryPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, payload, {
    encoding: 'utf8',
    flag: 'w',
    mode: 0o600,
  });
  try {
    fs.chmodSync(tmp, 0o600);
  } catch {
    // Windows may ignore mode bits; still rename.
  }
  fs.renameSync(tmp, discoveryPath);
  try {
    fs.chmodSync(discoveryPath, 0o600);
  } catch {
    // best-effort
  }
}

export function removeDiscoveryFile(discoveryPath: string): void {
  try {
    fs.unlinkSync(discoveryPath);
  } catch {
    // ignore missing
  }
}
