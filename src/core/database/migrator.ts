/**
 * Platform-agnostic N→N+1 schema migrator.
 *
 * No electron / node:fs / http imports — usable from Desktop Main, Extension Worker,
 * and Cardo Runtime (PR2) via adapter callbacks.
 *
 * Wild versions historically only 0 (empty) and 3 (current baseline). Versions 1 and 2
 * have no migration scripts and fail hard. After PR1, CURRENT is 4 (runtime_meta).
 */

import baselineMigrationSql from '../../../drizzle/0000_crazy_obadiah_stane.sql?raw';
import runtimeMetaMigrationSql from '../../../drizzle/0001_runtime_meta.sql?raw';
import systemPageIdsMigrationSql from '../../../drizzle/0002_system_page_ids.sql?raw';
import themePreferencesMigrationSql from '../../../drizzle/0003_theme_preferences.sql?raw';
import { BASELINE_SCHEMA_VERSION, DATABASE_SCHEMA_VERSION } from './version';

export interface MigratorAdapter {
  getUserVersion(): number;
  setUserVersion(version: number): void;
  exec(sql: string): void;
  begin(): void;
  commit(): void;
  rollback(): void;
}

/**
 * Target schema version for each forward step key: applying SQL reaches that version
 * from version - 1. Baseline (0000) is not listed here; it is applied only when
 * user_version === 0 and leaves the DB at BASELINE_SCHEMA_VERSION (3).
 */
const FORWARD_MIGRATIONS: Readonly<Record<number, string>> = {
  4: runtimeMetaMigrationSql,
  5: systemPageIdsMigrationSql,
  6: themePreferencesMigrationSql,
};

/**
 * Apply baseline + forward migrations until user_version === DATABASE_SCHEMA_VERSION.
 *
 * Algorithm:
 * - v === 0: apply 0000 baseline in a transaction, set user_version = 3, then continue
 * - v in {1, 2} or any version without a path to CURRENT: fail hard
 * - v > CURRENT: fail hard
 * - while v < CURRENT: apply step for v+1 in a transaction, set user_version = v+1
 */
export function applyMigrations(adapter: MigratorAdapter): void {
  let version = adapter.getUserVersion();

  if (version === 0) {
    runInTransaction(adapter, () => {
      adapter.exec(baselineMigrationSql);
      adapter.setUserVersion(BASELINE_SCHEMA_VERSION);
    });
    version = BASELINE_SCHEMA_VERSION;
  }

  if (version > DATABASE_SCHEMA_VERSION) {
    throw new Error(
      `Database schema version ${version} is newer than supported ${DATABASE_SCHEMA_VERSION}.`,
    );
  }

  while (version < DATABASE_SCHEMA_VERSION) {
    const nextVersion = version + 1;
    const sql = FORWARD_MIGRATIONS[nextVersion];
    if (!sql) {
      throw new Error(
        `Unsupported database schema version ${version}; no migration path to ${nextVersion} ` +
          `(supported wild versions were 0 and 3; current is ${DATABASE_SCHEMA_VERSION}).`,
      );
    }
    runInTransaction(adapter, () => {
      adapter.exec(sql);
      adapter.setUserVersion(nextVersion);
    });
    version = nextVersion;
  }
}

function runInTransaction(adapter: MigratorAdapter, fn: () => void): void {
  adapter.begin();
  try {
    fn();
    adapter.commit();
  } catch (error) {
    try {
      adapter.rollback();
    } catch {
      // ignore rollback failures; rethrow original
    }
    throw error;
  }
}

/**
 * Build a MigratorAdapter for any SQLite handle that exposes exec + PRAGMA user_version.
 * Suitable for node:sqlite DatabaseSync with a thin dialect adapter.
 *
 * Runtime (PR2) example with node:sqlite:
 * ```
 * const db = new DatabaseSync(dbPath);
 * applyMigrations(createSqlExecMigratorAdapter({
 *   exec: (sql) => db.exec(sql),
 *   getUserVersion: () => Number((db.prepare('PRAGMA user_version').get() as { user_version?: number })?.user_version ?? 0),
 * }));
 * ```
 */
export function createSqlExecMigratorAdapter(options: {
  exec: (sql: string) => void;
  getUserVersion: () => number;
  beginSql?: string;
}): MigratorAdapter {
  const beginSql = options.beginSql ?? 'BEGIN IMMEDIATE';
  return {
    getUserVersion: options.getUserVersion,
    setUserVersion(version: number) {
      if (!Number.isInteger(version) || version < 0) {
        throw new Error(`Invalid user_version ${String(version)}; expected non-negative integer.`);
      }
      options.exec(`PRAGMA user_version = ${version}`);
    },
    exec: options.exec,
    begin() {
      options.exec(beginSql);
    },
    commit() {
      options.exec('COMMIT');
    },
    rollback() {
      options.exec('ROLLBACK');
    },
  };
}
