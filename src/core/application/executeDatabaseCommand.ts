import type { WorkspaceCommand } from '../contracts/workspaceCommands';
import {
  getWorkspaceCommandDefinition,
  parseWorkspaceCommand,
} from '../contracts/workspaceCommands';
import { historyChangeSetSchema } from '../contracts/workspace';
import type { KhaosDatabase } from '../database/createDatabaseClient';
import { historyEntries, operationLog } from '../database/schema';
import type { DatabaseCommandResult } from './commandTypes';
import { executePageCommand, type PageCommand } from './pageCommandHandlers';

export async function executeDatabaseCommand(
  database: KhaosDatabase,
  input: WorkspaceCommand,
): Promise<DatabaseCommandResult> {
  const command = parseWorkspaceCommand(input);
  if (!command.type.startsWith('page.')) {
    throw new Error(`Database handler for ${command.type} is not implemented.`);
  }

  const definition = getWorkspaceCommandDefinition(command.type);
  const transactionId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  return await database.transaction(async (transaction) => {
    const mutation = await executePageCommand(transaction, command as PageCommand);
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

    return mutation.result ?? {};
  });
}
