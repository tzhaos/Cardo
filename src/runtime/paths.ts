/**
 * Shared Cardo path resolver (CLI + Desktop embed/attach).
 *
 * Path SoT:
 *   directory segment: `cardo`
 *   database file: `cardo.sqlite`
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
 *
 * If the SoT database is missing and a previous install database is present
 * under the default location, it is moved into the SoT path once on first open.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CARDO_DB_FILENAME = 'cardo.sqlite';
export const CARDO_LOCK_FILENAME = 'runtime.lock';
export const CARDO_DISCOVERY_FILENAME = 'discovery.json';
export const CARDO_LOG_FILENAME = 'runtime.log';

/**
 * Electron userData directory segment. Must match app.setName(...) on Desktop.
 * Path SoT is package-aligned `cardo` (not productName display casing).
 */
export const CARDO_USER_DATA_DIR_NAME = 'cardo';

/** Previous default data-dir segment names that may still hold a database file. */
const PREVIOUS_USER_DATA_DIR_NAMES = ['khaosbox', 'KhaosBox'] as const;
const PREVIOUS_DB_FILENAME = 'khaosbox.sqlite';

export interface CardoDataPaths {
  dataDir: string;
  dbPath: string;
  lockPath: string;
  discoveryPath: string;
  logPath: string;
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

function moveSqliteBundle(fromDbPath: string, toDbPath: string): void {
  fs.mkdirSync(path.dirname(toDbPath), { recursive: true });
  for (const suffix of ['', '-wal', '-shm'] as const) {
    const from = `${fromDbPath}${suffix}`;
    const to = `${toDbPath}${suffix}`;
    if (!fs.existsSync(from)) continue;
    try {
      fs.renameSync(from, to);
    } catch {
      fs.copyFileSync(from, to);
      fs.unlinkSync(from);
    }
  }
}

/**
 * One-way relocate of a previous default install DB into the Cardo SoT path.
 * Only runs when resolving the default data dir (no CARDO_DATA_DIR / explicit dir).
 * After `cardo.sqlite` exists, previous paths are never consulted again.
 */
function relocatePreviousDatabaseIfNeeded(paths: CardoDataPaths): void {
  if (fs.existsSync(paths.dbPath)) return;

  for (const segment of PREVIOUS_USER_DATA_DIR_NAMES) {
    const previousDir = joinUserDataDir(segment);
    if (path.resolve(previousDir) === path.resolve(paths.dataDir)) continue;
    const previousDb = path.join(previousDir, PREVIOUS_DB_FILENAME);
    if (!fs.existsSync(previousDb)) continue;
    moveSqliteBundle(previousDb, paths.dbPath);
    return;
  }

  // Same directory already named cardo but still holding the previous filename.
  const sameDirPrevious = path.join(paths.dataDir, PREVIOUS_DB_FILENAME);
  if (fs.existsSync(sameDirPrevious) && sameDirPrevious !== paths.dbPath) {
    moveSqliteBundle(sameDirPrevious, paths.dbPath);
  }
}

export function resolveCardoDataPaths(dataDir?: string): CardoDataPaths {
  const usingDefaultDir = !dataDir?.trim() && !process.env.CARDO_DATA_DIR?.trim();
  const resolvedDir = path.resolve(dataDir?.trim() || resolveDefaultDataDir());
  const paths: CardoDataPaths = {
    dataDir: resolvedDir,
    dbPath: path.join(resolvedDir, CARDO_DB_FILENAME),
    lockPath: path.join(resolvedDir, CARDO_LOCK_FILENAME),
    discoveryPath: path.join(resolvedDir, CARDO_DISCOVERY_FILENAME),
    logPath: path.join(resolvedDir, CARDO_LOG_FILENAME),
  };

  if (usingDefaultDir) {
    relocatePreviousDatabaseIfNeeded(paths);
  }

  return paths;
}

export function ensureDataDir(dataDir: string): void {
  fs.mkdirSync(dataDir, { recursive: true });
}
