import sqlite3InitModule, { type BindableValue, type Database } from '@sqlite.org/sqlite-wasm';
import {
  databaseExecuteResponseSchema,
  databaseWorkerRequestSchema,
  type DatabaseExecuteRequest,
  type DatabaseExecuteResponse,
  type DatabaseWorkerResponse,
} from '../../core/contracts/database';
import { applyMigrations, createSqlExecMigratorAdapter } from '../../core/database/migrator';

const DATABASE_FILENAME = 'khaosbox.sqlite';
const OPFS_SAH_VFS_NAME = 'khaosbox-opfs-sahpool';

const workerScope = self as unknown as {
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
  postMessage(
    message: DatabaseWorkerResponse | { type: 'khaosbox-db-storage'; storage: string },
  ): void;
};
let databasePromise: Promise<Database> | null = null;
let executionQueue = Promise.resolve();
let storageMode: 'opfs-sahpool' | 'opfs' | 'memory' = 'memory';

type Sqlite3Module = Awaited<ReturnType<typeof sqlite3InitModule>> & {
  installOpfsSAHPoolVfs?: (options?: {
    name?: string;
    directory?: string;
    clearOnInit?: boolean;
    initialCapacity?: number;
  }) => Promise<{
    OpfsSAHPoolDb: new (...args: unknown[]) => Database;
  }>;
};

async function openPersistentDatabase(sqlite3: Sqlite3Module): Promise<Database> {
  // Prefer SAH pool: no SharedArrayBuffer / COOP-COEP dependency, works in extension workers.
  if (typeof sqlite3.installOpfsSAHPoolVfs === 'function') {
    try {
      const pool = await sqlite3.installOpfsSAHPoolVfs({
        name: OPFS_SAH_VFS_NAME,
        initialCapacity: 8,
      });
      const database = new pool.OpfsSAHPoolDb(DATABASE_FILENAME);
      storageMode = 'opfs-sahpool';
      console.info('[KhaosBox] database storage: opfs-sahpool');
      return database;
    } catch (error) {
      console.warn('[KhaosBox] opfs-sahpool unavailable, trying classic opfs', error);
    }
  }

  // Classic OPFS VFS (requires SharedArrayBuffer + COOP/COEP).
  if (sqlite3.oo1?.OpfsDb) {
    try {
      const database = new sqlite3.oo1.OpfsDb(`/${DATABASE_FILENAME}`, 'c');
      storageMode = 'opfs';
      console.info('[KhaosBox] database storage: opfs');
      return database;
    } catch (error) {
      console.warn('[KhaosBox] classic opfs unavailable', error);
    }
  }

  storageMode = 'memory';
  console.error(
    '[KhaosBox] OPFS persistence unavailable; using in-memory SQLite. Data will not survive page reloads.',
  );
  return new sqlite3.oo1.DB(':memory:', 'c');
}

async function openDatabase() {
  const sqlite3 = (await sqlite3InitModule()) as Sqlite3Module;

  const database = await openPersistentDatabase(sqlite3);

  try {
    applyMigrations(
      createSqlExecMigratorAdapter({
        exec: (sql) => {
          database.exec(sql);
        },
        getUserVersion: () => {
          const versionRows = database.exec({
            sql: 'PRAGMA user_version',
            rowMode: 'array',
            returnValue: 'resultRows',
          });
          return Number(versionRows[0]?.[0] ?? 0);
        },
      }),
    );
  } catch (error) {
    database.close();
    throw error;
  }

  database.exec('PRAGMA foreign_keys = ON');
  workerScope.postMessage({ type: 'khaosbox-db-storage', storage: storageMode });
  return database;
}

function getDatabase() {
  databasePromise ??= openDatabase();
  return databasePromise;
}

async function executeRequest(request: DatabaseExecuteRequest): Promise<DatabaseExecuteResponse> {
  const database = await getDatabase();
  const bind = request.params as BindableValue[];

  if (request.method === 'run') {
    database.exec({ sql: request.sql, bind });
    return databaseExecuteResponseSchema.parse({ rows: [] });
  }

  const rows = database.exec({
    sql: request.sql,
    bind,
    rowMode: 'array',
    returnValue: 'resultRows',
  }) as unknown[][];

  // Drizzle sqlite-proxy mapGetResult expects:
  // - null / undefined when no row
  // - a single row value array when a row exists (not nested in another array)
  if (request.method === 'get') {
    const row = rows[0];
    return databaseExecuteResponseSchema.parse({ rows: row ?? null });
  }

  // all / values expect a 2D row matrix
  return databaseExecuteResponseSchema.parse({ rows });
}

workerScope.addEventListener('message', (event: MessageEvent<unknown>) => {
  executionQueue = executionQueue.then(async () => {
    let id = '';
    try {
      const message = databaseWorkerRequestSchema.parse(event.data);
      id = message.id;
      const response: DatabaseWorkerResponse = {
        id,
        ok: true,
        response: await executeRequest(message.request),
      };
      workerScope.postMessage(response);
    } catch (error) {
      const response: DatabaseWorkerResponse = {
        id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
      workerScope.postMessage(response);
    }
  });
});
