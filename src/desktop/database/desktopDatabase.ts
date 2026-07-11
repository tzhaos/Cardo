import { app } from 'electron';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import path from 'node:path';
import {
  databaseExecuteRequestSchema,
  databaseExecuteResponseSchema,
  type DatabaseExecuteResponse,
} from '../../core/contracts/database';
import { applyMigrations, createSqlExecMigratorAdapter } from '../../core/database/migrator';

let database: DatabaseSync | null = null;

function getDatabase() {
  if (database) return database;

  const nextDatabase = new DatabaseSync(path.join(app.getPath('userData'), 'khaosbox.sqlite'));
  nextDatabase.exec('PRAGMA foreign_keys = ON');
  nextDatabase.exec('PRAGMA journal_mode = WAL');

  try {
    applyMigrations(
      createSqlExecMigratorAdapter({
        exec: (sql) => nextDatabase.exec(sql),
        getUserVersion: () => {
          const versionRow = nextDatabase.prepare('PRAGMA user_version').get() as
            | { user_version?: number }
            | undefined;
          return versionRow?.user_version ?? 0;
        },
      }),
    );
  } catch (error) {
    nextDatabase.close();
    throw error;
  }

  database = nextDatabase;
  return nextDatabase;
}

export function executeDesktopDatabase(input: unknown): DatabaseExecuteResponse {
  const request = databaseExecuteRequestSchema.parse(input);
  const statement = getDatabase().prepare(request.sql);
  const params = request.params as SQLInputValue[];

  if (request.method === 'run') {
    statement.run(...params);
    return databaseExecuteResponseSchema.parse({ rows: [] });
  }

  statement.setReturnArrays(true);

  if (request.method === 'get') {
    const row = statement.get(...params) as unknown[] | undefined;
    return databaseExecuteResponseSchema.parse({ rows: row ?? null });
  }

  return databaseExecuteResponseSchema.parse({ rows: statement.all(...params) });
}

export function closeDesktopDatabase() {
  database?.close();
  database = null;
}
