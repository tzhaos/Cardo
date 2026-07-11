import { eq } from 'drizzle-orm';
import type { WorkspaceCommand } from '../contracts/workspaceCommands';
import { PREFERENCES_ID, preferences } from '../database/schema';
import type { DatabaseCommandMutation, DatabaseTransaction } from './commandTypes';
import { rowChange } from './historyChanges';

type PreferencesCommandType =
  | 'preferences.setLocale'
  | 'preferences.setColorMode'
  | 'preferences.setTheme'
  | 'preferences.setFontFamily'
  | 'preferences.setFontScale'
  | 'preferences.setDensity'
  | 'preferences.setThemeColorOverrides'
  | 'preferences.setThemeOptionValues'
  | 'preferences.setImportedThemePacks'
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
  if (isPreferencesUnchanged(before, after, patch)) {
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
    case 'preferences.setFontFamily':
      return { fontFamily: command.fontFamily };
    case 'preferences.setFontScale':
      return { fontScale: command.fontScale };
    case 'preferences.setDensity':
      return { density: command.density };
    case 'preferences.setThemeColorOverrides':
      return { themeColorOverrides: command.themeColorOverrides };
    case 'preferences.setThemeOptionValues':
      return { themeOptionValues: command.themeOptionValues };
    case 'preferences.setImportedThemePacks':
      return { importedThemePacks: command.importedThemePacks };
    case 'preferences.setSearchEngine':
      return { searchEngine: command.searchEngine };
    case 'preferences.setCustomSearchTemplate':
      return { customSearchTemplate: command.customSearchTemplate };
  }
}

function isPreferencesUnchanged(
  before: typeof preferences.$inferSelect,
  after: typeof preferences.$inferSelect,
  patch: Partial<typeof preferences.$inferInsert>,
): boolean {
  for (const key of Object.keys(patch) as Array<keyof typeof patch>) {
    const left = before[key as keyof typeof before];
    const right = after[key as keyof typeof after];
    if (typeof left === 'object' || typeof right === 'object') {
      if (JSON.stringify(left) !== JSON.stringify(right)) return false;
    } else if (left !== right) {
      return false;
    }
  }
  return true;
}
