/**
 * Runtime SQLite open via node:sqlite + core migrator + DatabasePort wrapper.
 * No electron imports.
 */

import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { DatabasePort } from '../core/ports/DatabasePort';
import {
  databaseExecuteRequestSchema,
  type DatabaseExecuteResponse,
} from '../core/contracts/database';
import { applyMigrations, createSqlExecMigratorAdapter } from '../core/database/migrator';
import { createDatabaseClient, type KhaosDatabase } from '../core/database/createDatabaseClient';

export interface RuntimeDatabaseHandle {
  raw: DatabaseSync;
  port: DatabasePort;
  database: KhaosDatabase;
  close: () => void;
}

export function openRuntimeDatabase(dbPath: string): RuntimeDatabaseHandle {
  const raw = new DatabaseSync(dbPath);
  raw.exec('PRAGMA foreign_keys = ON');
  raw.exec('PRAGMA journal_mode = WAL');

  try {
    applyMigrations(
      createSqlExecMigratorAdapter({
        exec: (sql) => raw.exec(sql),
        getUserVersion: () => {
          const versionRow = raw.prepare('PRAGMA user_version').get() as
            | { user_version?: number }
            | undefined;
          return versionRow?.user_version ?? 0;
        },
      }),
    );
  } catch (error) {
    raw.close();
    throw error;
  }

  const port: DatabasePort = {
    async execute(input): Promise<DatabaseExecuteResponse> {
      const request = databaseExecuteRequestSchema.parse(input);
      const statement = raw.prepare(request.sql);
      const params = request.params as SQLInputValue[];

      if (request.method === 'run') {
        statement.run(...params);
        return { rows: [] };
      }

      statement.setReturnArrays(true);

      if (request.method === 'get') {
        const row = statement.get(...params) as unknown[] | undefined;
        return { rows: row ?? null };
      }

      return { rows: statement.all(...params) as unknown[][] };
    },
  };

  const database = createDatabaseClient(port);

  return {
    raw,
    port,
    database,
    close: () => {
      try {
        raw.close();
      } catch {
        // ignore double-close
      }
    },
  };
}
