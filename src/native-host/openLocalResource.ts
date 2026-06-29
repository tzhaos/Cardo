import fs from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import {
  normalizeLocalResourcePath,
  validateLocalResourcePath,
} from '../core/services/localResourcePath';
import { writeNativeHostDiagnostic } from './diagnostics';

export { normalizeLocalResourcePath, validateLocalResourcePath };

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
