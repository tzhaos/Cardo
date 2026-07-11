/**
 * Shared Cardo path resolver (CLI + Desktop embed/attach).
 *
 * v1 keeps one sqlite file so attach/embed share one DB (design §2.1).
 * Filename: khaosbox.sqlite (kept for data-path continuity after product rename).
 *
 * Directory SoT: CARDO_USER_DATA_DIR_NAME = 'khaosbox' (NOT package.json name `cardo`
 * and NOT productName `Cardo`). Desktop Main must call `app.setName('khaosbox')`
 * before any `app.getPath('userData')` so Electron userData matches this resolver.
 * Both CLI and Desktop open via `resolveCardoDataPaths().dbPath`.
 *
 * Defaults:
 *   win32:  %APPDATA%/khaosbox
 *   darwin: ~/Library/Application Support/khaosbox
 *   linux:  ${XDG_CONFIG_HOME:-~/.config}/khaosbox
 *
 * Override with CARDO_DATA_DIR (absolute directory).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CARDO_DB_FILENAME = 'khaosbox.sqlite';
export const CARDO_LOCK_FILENAME = 'runtime.lock';
export const CARDO_DISCOVERY_FILENAME = 'discovery.json';
export const CARDO_LOG_FILENAME = 'runtime.log';

/**
 * Electron userData directory segment. Must match app.setName(...) on Desktop.
 * Intentionally kept as `khaosbox` for AppData path continuity (not package name `cardo`
 * or productName `Cardo`). Path relocation is a separate later PR.
 */
export const CARDO_USER_DATA_DIR_NAME = 'khaosbox';

export interface CardoDataPaths {
  dataDir: string;
  dbPath: string;
  lockPath: string;
  discoveryPath: string;
  logPath: string;
}

/**
 * Resolve default userData-equivalent directory for the current platform.
 * Matches Electron app.getPath('userData') when app.setName('khaosbox') is applied.
 */
export function resolveDefaultDataDir(): string {
  const override = process.env.CARDO_DATA_DIR?.trim();
  if (override) {
    return path.resolve(override);
  }

  const home = os.homedir();
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA?.trim();
    if (appData) {
      return path.join(appData, CARDO_USER_DATA_DIR_NAME);
    }
    return path.join(home, 'AppData', 'Roaming', CARDO_USER_DATA_DIR_NAME);
  }

  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', CARDO_USER_DATA_DIR_NAME);
  }

  const xdg = process.env.XDG_CONFIG_HOME?.trim();
  if (xdg) {
    return path.join(xdg, CARDO_USER_DATA_DIR_NAME);
  }
  return path.join(home, '.config', CARDO_USER_DATA_DIR_NAME);
}

export function resolveCardoDataPaths(dataDir?: string): CardoDataPaths {
  const resolvedDir = path.resolve(dataDir?.trim() || resolveDefaultDataDir());
  return {
    dataDir: resolvedDir,
    dbPath: path.join(resolvedDir, CARDO_DB_FILENAME),
    lockPath: path.join(resolvedDir, CARDO_LOCK_FILENAME),
    discoveryPath: path.join(resolvedDir, CARDO_DISCOVERY_FILENAME),
    logPath: path.join(resolvedDir, CARDO_LOG_FILENAME),
  };
}

export function ensureDataDir(dataDir: string): void {
  fs.mkdirSync(dataDir, { recursive: true });
}
