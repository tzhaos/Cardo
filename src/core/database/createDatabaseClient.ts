import { drizzle } from 'drizzle-orm/sqlite-proxy';
import type { DatabasePort } from '../ports/DatabasePort';
import { databaseSchema } from './schema';

export function createDatabaseClient(port: DatabasePort) {
  return drizzle(
    async (sql, params, method) => {
      const response = await port.execute({ sql, params, method });
      return { rows: response.rows };
    },
    { schema: databaseSchema },
  );
}

export type KhaosDatabase = ReturnType<typeof createDatabaseClient>;
