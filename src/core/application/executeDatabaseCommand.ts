import type { WorkspaceCommand } from '../contracts/workspaceCommands';
import {
  getWorkspaceCommandDefinition,
  parseWorkspaceCommand,
} from '../contracts/workspaceCommands';
import { historyChangeSetSchema } from '../contracts/history';
import type { KhaosDatabase } from '../database/createDatabaseClient';
import { bumpRevision } from '../database/revision';
import { eq } from 'drizzle-orm';
import { historyEntries, operationLog } from '../database/schema';
import type { DatabaseCommandResult } from './commandTypes';
import { getDatabaseCommandHandler } from './databaseCommandRegistry';

export async function executeDatabaseCommand(
  database: KhaosDatabase,
  input: WorkspaceCommand,
): Promise<DatabaseCommandResult> {
  const command = parseWorkspaceCommand(input);
  const definition = getWorkspaceCommandDefinition(command.type);
  const handler = getDatabaseCommandHandler(command.type);
  const transactionId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  return await database.transaction(async (transaction) => {
    const mutation = await handler(transaction, command);
    if (!mutation.changes.length) return mutation.result ?? {};

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
        changes: historyChangeSetSchema.parse(mutation.changes),
        state: 'applied',
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    // Successful mutating txn with changes: revision++ (never in history change set).
    await bumpRevision(transaction);

    return mutation.result ?? {};
  });
}
