import type { WorkspaceCommand } from '../contracts/workspaceCommands';
import {
  getWorkspaceCommandDefinition,
  parseWorkspaceCommand,
} from '../contracts/workspaceCommands';
import { historyChangeSetSchema } from '../contracts/workspace';
import type { KhaosDatabase } from '../database/createDatabaseClient';
import { eq } from 'drizzle-orm';
import { historyEntries, operationLog } from '../database/schema';
import type { DatabaseCommandResult } from './commandTypes';
import { executePageCommand, type PageCommand } from './pageCommandHandlers';
import { executeBoxCommand, type BoxCommand } from './boxCommandHandlers';

export async function executeDatabaseCommand(
  database: KhaosDatabase,
  input: WorkspaceCommand,
): Promise<DatabaseCommandResult> {
  const command = parseWorkspaceCommand(input);
  const isPageCommand = command.type.startsWith('page.');
  const isBoxCommand =
    command.type.startsWith('box.') ||
    command.type.startsWith('collection.') ||
    command.type.startsWith('canvas.') ||
    command.type === 'system.constrainFrames';
  if (!isPageCommand && !isBoxCommand) {
    throw new Error(`Database handler for ${command.type} is not implemented.`);
  }

  const definition = getWorkspaceCommandDefinition(command.type);
  const transactionId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  return await database.transaction(async (transaction) => {
    const mutation = isPageCommand
      ? await executePageCommand(transaction, command as PageCommand)
      : await executeBoxCommand(transaction, command as BoxCommand);
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

    return mutation.result ?? {};
  });
}
