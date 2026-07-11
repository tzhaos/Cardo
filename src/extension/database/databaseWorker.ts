import sqlite3InitModule, { type BindableValue, type Database } from '@sqlite.org/sqlite-wasm';
import initialMigration from '../../../drizzle/0000_crazy_obadiah_stane.sql?raw';
import {
  databaseExecuteResponseSchema,
  databaseWorkerRequestSchema,
  type DatabaseExecuteRequest,
  type DatabaseExecuteResponse,
  type DatabaseWorkerResponse,
} from '../../core/contracts/database';
import { DATABASE_SCHEMA_VERSION } from '../../core/database/version';

const workerScope = self as unknown as {
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
  postMessage(message: DatabaseWorkerResponse): void;
};
let databasePromise: Promise<Database> | null = null;
let executionQueue = Promise.resolve();

async function openDatabase() {
  const sqlite3 = await sqlite3InitModule();

  const database: Database =
    'opfs' in sqlite3 && sqlite3.oo1.OpfsDb
      ? new sqlite3.oo1.OpfsDb('/khaosbox.sqlite', 'c')
      : new sqlite3.oo1.DB(':memory:', 'c');
  const versionRows = database.exec({
    sql: 'PRAGMA user_version',
    rowMode: 'array',
    returnValue: 'resultRows',
  });
  const version = Number(versionRows[0]?.[0] ?? 0);

  if (version === 0) {
    database.exec('BEGIN IMMEDIATE');
    try {
      database.exec(initialMigration);
      database.exec(`PRAGMA user_version = ${DATABASE_SCHEMA_VERSION}`);
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      database.close();
      throw error;
    }
  } else if (version !== DATABASE_SCHEMA_VERSION) {
    database.close();
    throw new Error(
      `Unsupported KhaosBox database schema ${version}; expected ${DATABASE_SCHEMA_VERSION}.`,
    );
  }

  database.exec('PRAGMA foreign_keys = ON');
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
  });

  if (request.method === 'get') {
    return databaseExecuteResponseSchema.parse({ rows: rows[0] ?? null });
  }

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
