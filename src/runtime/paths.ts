/**
 * Shared Cardo path resolver (CLI + Desktop embed/attach).
 *
 * Path SoT only:
 *   directory segment: `cardo`
 *   database file: `cardo.sqlite`
 *
 * No previous-install relocate. Only the SoT paths above are used.
 *
 * Desktop Main must call `app.setName(CARDO_USER_DATA_DIR_NAME)` before any
 * `app.getPath('userData')` so Electron userData matches this resolver.
 * Both CLI and Desktop open via `resolveCardoDataPaths().dbPath`.
 *
 * Defaults:
 *   win32:  %APPDATA%/cardo
 *   darwin: ~/Library/Application Support/cardo
 *   linux:  ${XDG_CONFIG_HOME:-~/.config}/cardo
 *
 * Override with CARDO_DATA_DIR (absolute directory).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CARDO_DB_FILENAME = 'cardo.sqlite';
export const CARDO_LOCK_FILENAME = 'runtime.lock';
export const CARDO_DISCOVERY_FILENAME = 'discovery.json';
export const CARDO_LOG_FILENAME = 'runtime.log';
/** User Theme Pack drop folder under the Cardo data directory. */
export const CARDO_THEMES_DIRNAME = 'themes';

/**
 * Electron userData directory segment. Must match app.setName(...) on Desktop.
 * Path SoT is package-aligned `cardo` (not productName display casing).
 */
export const CARDO_USER_DATA_DIR_NAME = 'cardo';

export interface CardoDataPaths {
  dataDir: string;
  dbPath: string;
  lockPath: string;
  discoveryPath: string;
  logPath: string;
  /** `%DATA%/themes` — user `.cardo-theme.json` packs (file-based, not DB). */
  themesDir: string;
}

function joinUserDataDir(segment: string): string {
  const home = os.homedir();
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA?.trim();
    if (appData) {
      return path.join(appData, segment);
    }
    return path.join(home, 'AppData', 'Roaming', segment);
  }

  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', segment);
  }

  const xdg = process.env.XDG_CONFIG_HOME?.trim();
  if (xdg) {
    return path.join(xdg, segment);
  }
  return path.join(home, '.config', segment);
}

/**
 * Resolve default userData-equivalent directory for the current platform.
 * Matches Electron app.getPath('userData') when app.setName('cardo') is applied.
 */
export function resolveDefaultDataDir(): string {
  const override = process.env.CARDO_DATA_DIR?.trim();
  if (override) {
    return path.resolve(override);
  }

  return joinUserDataDir(CARDO_USER_DATA_DIR_NAME);
}

export function resolveCardoDataPaths(dataDir?: string): CardoDataPaths {
  const resolvedDir = path.resolve(dataDir?.trim() || resolveDefaultDataDir());
  return {
    dataDir: resolvedDir,
    dbPath: path.join(resolvedDir, CARDO_DB_FILENAME),
    lockPath: path.join(resolvedDir, CARDO_LOCK_FILENAME),
    discoveryPath: path.join(resolvedDir, CARDO_DISCOVERY_FILENAME),
    logPath: path.join(resolvedDir, CARDO_LOG_FILENAME),
    themesDir: path.join(resolvedDir, CARDO_THEMES_DIRNAME),
  };
}

export function ensureDataDir(dataDir: string): void {
  fs.mkdirSync(dataDir, { recursive: true });
}

export function ensureThemesDir(themesDir: string): void {
  fs.mkdirSync(themesDir, { recursive: true });
}
