import { desc } from 'drizzle-orm';
import type { CardoDatabase } from '../database/createDatabaseClient';
import { operationLog } from '../database/schema';

export interface ActivityLogInput {
  action: string;
  target?: Record<string, string | undefined>;
  details?: Record<string, string | number | boolean | null>;
}

export async function recordDatabaseActivity(database: CardoDatabase, input: ActivityLogInput) {
  const transactionId = crypto.randomUUID();
  await database.insert(operationLog).values({
    id: crypto.randomUUID(),
    transactionId,
    commandType: input.action,
    commandPayload: {
      category: 'activity',
      ...(input.target ? { target: input.target } : {}),
      ...(input.details ? { details: input.details } : {}),
    },
    source: 'user',
    undoable: false,
    createdAt: new Date().toISOString(),
  });
}

export async function getOperationLogEntries(database: CardoDatabase, limit = 5000) {
  return await database
    .select()
    .from(operationLog)
    .orderBy(desc(operationLog.createdAt))
    .limit(limit)
    .all();
}
