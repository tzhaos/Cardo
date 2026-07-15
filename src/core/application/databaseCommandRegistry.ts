import type { WorkspaceCommand, WorkspaceCommandType } from '../contracts/workspaceCommands';
import type { DatabaseCommandMutation, DatabaseTransaction } from './commandTypes';
import { executePageCommand } from './pageCommandHandlers';
import { executeBoxCommand } from './boxCommandHandlers';
import { executeItemCommand } from './itemCommandHandlers';
import { executePreferencesCommand } from './preferencesCommandHandlers';
import { executeWorkspaceImport } from './workspaceCommandHandlers';

export type DatabaseCommandHandler<Type extends WorkspaceCommandType> = (
  transaction: DatabaseTransaction,
  command: Extract<WorkspaceCommand, { type: Type }>,
) => Promise<DatabaseCommandMutation>;

type DatabaseCommandRegistry = {
  [Type in WorkspaceCommandType]: DatabaseCommandHandler<Type>;
};

export const databaseCommandRegistry = Object.freeze({
  'workspace.import': executeWorkspaceImport,
  'page.create': executePageCommand,
  'page.rename': executePageCommand,
  'page.delete': executePageCommand,
  'page.reorder': executePageCommand,
  'page.setDefault': executePageCommand,
  'page.open': executePageCommand,

  'preferences.setLocale': executePreferencesCommand,
  'preferences.setColorMode': executePreferencesCommand,
  'preferences.setTheme': executePreferencesCommand,
  'preferences.setFontFamily': executePreferencesCommand,
  'preferences.setFontScale': executePreferencesCommand,
  'preferences.setDensity': executePreferencesCommand,
  'preferences.setThemeColorOverrides': executePreferencesCommand,
  'preferences.setThemeOptionValues': executePreferencesCommand,
  'preferences.setImportedThemePacks': executePreferencesCommand,
  'preferences.setFeatureFlags': executePreferencesCommand,
  'preferences.setLayoutProfile': executePreferencesCommand,
  'preferences.setCssSnippet': executePreferencesCommand,
  'preferences.setCssSnippetEnabled': executePreferencesCommand,
  'preferences.setSearchEngine': executePreferencesCommand,
  'preferences.setCustomSearchTemplate': executePreferencesCommand,
  'box.create': executeBoxCommand,
  'box.updateFrame': executeBoxCommand,
  'box.rename': executeBoxCommand,
  'box.promote': executeBoxCommand,
  'box.setDetailMode': executeBoxCommand,
  'box.setLocked': executeBoxCommand,
  'box.setAppearance': executeBoxCommand,
  'box.setViewMode': executeBoxCommand,
  'box.moveToPage': executeBoxCommand,
  'box.collect': executeBoxCommand,
  'box.removeFromCollection': executeBoxCommand,
  'box.delete': executeBoxCommand,
  'collection.updateBoxFrame': executeBoxCommand,
  'collection.updateView': executeBoxCommand,
  'collection.arrange': executeBoxCommand,
  'canvas.arrange': executeBoxCommand,
  'system.constrainFrames': executeBoxCommand,
  'item.paste': executeItemCommand,
  'item.create': executeItemCommand,
  'item.rename': executeItemCommand,
  'item.editContent': executeItemCommand,
  'item.setPinned': executeItemCommand,
  'item.reorder': executeItemCommand,
  'item.moveBetweenBoxes': executeItemCommand,
  'item.delete': executeItemCommand,
  'bookmark.setFavicon': executeItemCommand,
} satisfies DatabaseCommandRegistry);

export function getDatabaseCommandHandler<Type extends WorkspaceCommandType>(type: Type) {
  return databaseCommandRegistry[type] as DatabaseCommandHandler<Type>;
}
