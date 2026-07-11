import type { WorkspaceCommand } from '../contracts/workspaceCommands';
import {
  getWorkspaceCommandDefinition,
  parseWorkspaceCommand,
} from '../contracts/workspaceCommands';
import { historyChangeSetSchema, type HistoryChangeSet } from '../contracts/history';
import type { CardoDatabase } from '../database/createDatabaseClient';
import { bumpRevision, getRevision } from '../database/revision';
import { eq } from 'drizzle-orm';
import { historyEntries, operationLog } from '../database/schema';
import type { DatabaseCommandResult } from './commandTypes';
import { getDatabaseCommandHandler } from './databaseCommandRegistry';

/** Full command execution meta for Runtime invalidation / SSE (PR2). */
export interface DatabaseCommandExecution {
  result: DatabaseCommandResult;
  changes: HistoryChangeSet;
  revision: number;
  /** True when the txn wrote changes and bumped revision. */
  mutated: boolean;
}

/**
 * Execute a workspace command in a single transaction (handler + op log + history + revision).
 * Returns result plus change set and post-txn revision so Runtime can derive scopes / fan out events.
 * Local hostPlatform should use `.result` only.
 */
export async function executeDatabaseCommand(
  database: CardoDatabase,
  input: WorkspaceCommand,
): Promise<DatabaseCommandExecution> {
  const command = parseWorkspaceCommand(input);
  const definition = getWorkspaceCommandDefinition(command.type);
  const handler = getDatabaseCommandHandler(command.type);
  const transactionId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  return await database.transaction(async (transaction) => {
    const mutation = await handler(transaction, command);
    const result = mutation.result ?? {};
    if (!mutation.changes.length) {
      const revision = await getRevision(transaction);
      return { result, changes: [], revision, mutated: false };
    }

    const changes = historyChangeSetSchema.parse(mutation.changes);

    await transaction.insert(operationLog).values({
      id: crypto.randomUUID(),
      transactionId,
      commandType: command.type,
      commandPayload: { ...command },
      source: 'user',
      undoable: definition.undoable,
      createdAt: timestamp,
    });

    if (definition.undoable) {
      await transaction.delete(historyEntries).where(eq(historyEntries.state, 'undone'));
      await transaction.insert(historyEntries).values({
        id: crypto.randomUUID(),
        transactionId,
        commandType: command.type,
        changes,
        state: 'applied',
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    // Successful mutating txn with changes: revision++ (never in history change set).
    const revision = await bumpRevision(transaction);

    return { result, changes, revision, mutated: true };
  });
}
