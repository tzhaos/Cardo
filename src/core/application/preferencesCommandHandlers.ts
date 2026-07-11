import { eq } from 'drizzle-orm';
import type { WorkspaceCommand } from '../contracts/workspaceCommands';
import { PREFERENCES_ID, preferences } from '../database/schema';
import type { DatabaseCommandMutation, DatabaseTransaction } from './commandTypes';
import { rowChange } from './historyChanges';

type PreferencesCommandType =
  | 'preferences.setLocale'
  | 'preferences.setColorMode'
  | 'preferences.setTheme'
  | 'preferences.setSearchEngine'
  | 'preferences.setCustomSearchTemplate';

export type PreferencesCommand = Extract<WorkspaceCommand, { type: PreferencesCommandType }>;

export async function executePreferencesCommand(
  transaction: DatabaseTransaction,
  command: PreferencesCommand,
): Promise<DatabaseCommandMutation> {
  const before = await transaction
    .select()
    .from(preferences)
    .where(eq(preferences.id, PREFERENCES_ID))
    .get();
  if (!before) throw new Error('Cardo preferences are not initialized.');

  const patch = getPatch(command);
  const after = { ...before, ...patch };
  if (
    Object.keys(patch).every(
      (key) => before[key as keyof typeof before] === after[key as keyof typeof after],
    )
  ) {
    return { changes: [] };
  }
  await transaction.update(preferences).set(patch).where(eq(preferences.id, PREFERENCES_ID));
  return {
    changes: [rowChange('preferences', { id: PREFERENCES_ID }, before, after)],
  };
}

function getPatch(command: PreferencesCommand): Partial<typeof preferences.$inferInsert> {
  switch (command.type) {
    case 'preferences.setLocale':
      return { locale: command.locale };
    case 'preferences.setColorMode':
      return { colorMode: command.colorMode };
    case 'preferences.setTheme':
      return { themeId: command.themeId };
    case 'preferences.setSearchEngine':
      return { searchEngine: command.searchEngine };
    case 'preferences.setCustomSearchTemplate':
      return { customSearchTemplate: command.customSearchTemplate };
  }
}
