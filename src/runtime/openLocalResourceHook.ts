/**
 * Default Node hook for capability.openLocalResource (CLI / Desktop inject this).
 * Kept outside native-host so Runtime does not depend on NM process packaging.
 */

import fs from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import {
  normalizeLocalResourcePath,
} from '../core/services/localResourcePath';

export async function defaultOpenLocalResource(resourcePath: string): Promise<boolean> {
  const normalized = normalizeLocalResourcePath(resourcePath);
  if (!normalized.ok) return false;

  if (process.platform === 'win32' && !fs.existsSync(normalized.path)) {
    return false;
  }

  if (process.platform === 'win32') {
    const result = spawnSync('cmd.exe', ['/d', '/s', '/c', 'start', '""', normalized.path], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return !result.error && result.status === 0;
  }

  const command = process.platform === 'darwin' ? 'open' : 'xdg-open';
  const child = spawn(command, [normalized.path], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return true;
}
