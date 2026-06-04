import fs from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeNativeHostDiagnostic } from './diagnostics';

function trimWrappingQuotes(value: string) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function normalizeLocalResourcePath(resourcePath: unknown) {
  if (typeof resourcePath !== 'string' || resourcePath.trim().length === 0) {
    return { ok: false as const, errorMessage: 'Resource path is empty.' };
  }

  if (resourcePath.includes('\0')) {
    return {
      ok: false as const,
      errorMessage: 'Resource path contains an invalid character.',
    };
  }

  const trimmedPath = trimWrappingQuotes(resourcePath);

  if (/^file:/i.test(trimmedPath)) {
    try {
      return { ok: true as const, path: fileURLToPath(trimmedPath) };
    } catch {
      return { ok: false as const, errorMessage: 'File URL is invalid.' };
    }
  }

  if (process.platform === 'win32') {
    if (/^[A-Za-z]:[\\/]/.test(trimmedPath)) {
      return { ok: true as const, path: trimmedPath.replace(/\//g, '\\') };
    }

    if (/^\\\\[^\\]+\\[^\\]+/.test(trimmedPath)) {
      return { ok: true as const, path: trimmedPath.replace(/\//g, '\\') };
    }
  }

  return { ok: true as const, path: trimmedPath };
}

export function validateLocalResourcePath(resourcePath: unknown) {
  const normalized = normalizeLocalResourcePath(resourcePath);
  return normalized.ok ? null : normalized.errorMessage;
}

function openWindowsPath(resourcePath: string) {
  const result = spawnSync('cmd.exe', ['/d', '/s', '/c', 'start', '""', resourcePath], {
    stdio: 'ignore',
    windowsHide: true,
  });

  if (result.error) {
    return result.error.message;
  }

  if (result.status !== 0) {
    return `Windows shell returned exit code ${result.status ?? 'unknown'}.`;
  }

  return null;
}

export function openLocalResource(resourcePath: string) {
  const normalized = normalizeLocalResourcePath(resourcePath);

  if (!normalized.ok) {
    writeNativeHostDiagnostic(`open-failed ${normalized.errorMessage}`);
    return { ok: false as const, errorMessage: normalized.errorMessage };
  }

  if (process.platform === 'win32' && !fs.existsSync(normalized.path)) {
    writeNativeHostDiagnostic(`open-failed missing ${normalized.path}`);
    return { ok: false as const, errorMessage: 'Local path does not exist.' };
  }

  if (process.platform === 'win32') {
    const openError = openWindowsPath(normalized.path);

    if (openError) {
      writeNativeHostDiagnostic(`open-failed ${openError} ${normalized.path}`);
      return { ok: false as const, errorMessage: openError };
    }

    writeNativeHostDiagnostic(`open-requested ${normalized.path}`);
    return { ok: true as const };
  }

  const command = process.platform === 'darwin' ? 'open' : 'xdg-open';
  const child = spawn(command, [resourcePath], {
    detached: true,
    stdio: 'ignore',
  });

  child.unref();
  writeNativeHostDiagnostic(`open-requested ${normalized.path}`);

  return { ok: true as const };
}
