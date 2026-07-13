/**
 * Minimal structured Runtime logging (JSON lines).
 * Never logs token, oneTimeCode, Authorization, or discovery.token.
 */

import fs from 'node:fs';
import path from 'node:path';

export type RuntimeLogLevel = 'info' | 'warn' | 'error';

/** Keys that must never appear in log fields (case-insensitive). */
const SECRET_KEY_RE = /^(token|onetimecode|one_time_code|authorization|password|secret)$/i;

let logFilePath: string | null = null;

/**
 * Optional file sink (e.g. `%DATA%/runtime.log`). stderr always receives the line.
 */
export function setRuntimeLogPath(filePath: string | null | undefined): void {
  const trimmed = filePath?.trim();
  logFilePath = trimmed && trimmed.length > 0 ? trimmed : null;
}

export function getRuntimeLogPath(): string | null {
  return logFilePath;
}

function redactValue(key: string, value: unknown): unknown {
  if (SECRET_KEY_RE.test(key)) {
    return undefined;
  }
  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    if (value instanceof Error) {
      return { name: value.name, message: value.message, stack: value.stack };
    }
    const input = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (SECRET_KEY_RE.test(k)) {
        continue;
      }
      out[k] = redactValue(k, v);
    }
    return out;
  }
  return value;
}

function redactFields(fields?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!fields) {
    return undefined;
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SECRET_KEY_RE.test(key)) {
      continue;
    }
    out[key] = redactValue(key, value);
  }
  return out;
}

/**
 * Write one JSON line to stderr (and optional log file).
 * Safe fields include: pid, port, commandType, durationMs, code, clientId, outcome.
 */
export function runtimeLog(
  level: RuntimeLogLevel,
  event: string,
  fields?: Record<string, unknown>,
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...redactFields(fields),
  });

  try {
    process.stderr.write(`${line}\n`);
  } catch {
    // ignore stderr failures
  }

  if (!logFilePath) {
    return;
  }

  try {
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
    fs.appendFileSync(logFilePath, `${line}\n`);
  } catch {
    // ignore file write failures
  }
}
