import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import {
  databaseExecuteRequestSchema,
  databaseExecuteResponseSchema,
  type DatabaseExecuteResponse,
} from '../../core/contracts/database';
import { applyMigrations, createSqlExecMigratorAdapter } from '../../core/database/migrator';
import { resolveCardoDataPaths } from '../../runtime/paths';

let database: DatabaseSync | null = null;

function getDatabase() {
  if (database) return database;

  // Shared SoT with CLI Runtime (design §2.1). Desktop Main must call
  // app.setName(CARDO_USER_DATA_DIR_NAME) before any getPath('userData') so this
  // path matches Electron's default userData when CARDO_DATA_DIR is unset.
  const { dbPath } = resolveCardoDataPaths();
  console.info(`[KhaosBox] desktop dbPath: ${dbPath}`);

  const nextDatabase = new DatabaseSync(dbPath);
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
