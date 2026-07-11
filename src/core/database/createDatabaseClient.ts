import { drizzle } from 'drizzle-orm/sqlite-proxy';
import type { DatabasePort } from '../ports/DatabasePort';
import { databaseSchema } from './schema';
import { databaseExecuteRequestSchema } from '../contracts/database';

export function createDatabaseClient(port: DatabasePort) {
  return drizzle(
    async (sql, params, method) => {
      const response = await port.execute(
        databaseExecuteRequestSchema.parse({ sql, params, method }),
      );
      // sqlite-proxy uses null as the runtime sentinel for an empty `get`,
      // although its public callback type only declares array results.
      return { rows: response.rows as unknown[] };
    },
    { schema: databaseSchema },
  );
}

export type CardoDatabase = ReturnType<typeof createDatabaseClient>;
