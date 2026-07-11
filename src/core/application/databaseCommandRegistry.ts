import type {
  WorkspaceCommand,
  WorkspaceCommandType,
} from '../contracts/workspaceCommands';
import type { DatabaseCommandMutation, DatabaseTransaction } from './commandTypes';
import { executePageCommand, type PageCommand } from './pageCommandHandlers';
import { executeBoxCommand, type BoxCommand } from './boxCommandHandlers';
import { executeItemCommand, type ItemCommand } from './itemCommandHandlers';
import {
  executePreferencesCommand,
  type PreferencesCommand,
} from './preferencesCommandHandlers';
import {
  executeWorkspaceImport,
  type WorkspaceImportCommand,
} from './workspaceCommandHandlers';

export type DatabaseCommandHandler = (
  transaction: DatabaseTransaction,
  command: WorkspaceCommand,
) => Promise<DatabaseCommandMutation>;

const pageHandler: DatabaseCommandHandler = (transaction, command) =>
  executePageCommand(transaction, command as PageCommand);

const boxHandler: DatabaseCommandHandler = (transaction, command) =>
  executeBoxCommand(transaction, command as BoxCommand);

const itemHandler: DatabaseCommandHandler = (transaction, command) =>
  executeItemCommand(transaction, command as ItemCommand);

const preferencesHandler: DatabaseCommandHandler = (transaction, command) =>
  executePreferencesCommand(transaction, command as PreferencesCommand);

const workspaceImportHandler: DatabaseCommandHandler = (transaction, command) =>
  executeWorkspaceImport(transaction, command as WorkspaceImportCommand);

export const databaseCommandRegistry = Object.freeze({
  'workspace.import': workspaceImportHandler,
  'page.create': pageHandler,
  'page.rename': pageHandler,
  'page.delete': pageHandler,
  'page.reorder': pageHandler,
  'page.setDefault': pageHandler,
  'page.open': pageHandler,
  'preferences.setLocale': preferencesHandler,
  'preferences.setColorMode': preferencesHandler,
  'preferences.setTheme': preferencesHandler,
  'preferences.setSearchEngine': preferencesHandler,
  'preferences.setCustomSearchTemplate': preferencesHandler,
  'box.create': boxHandler,
  'box.updateFrame': boxHandler,
  'box.rename': boxHandler,
  'box.promote': boxHandler,
  'box.setDetailMode': boxHandler,
  'box.setLocked': boxHandler,
  'box.setAppearance': boxHandler,
  'box.setViewMode': boxHandler,
  'box.moveToPage': boxHandler,
  'box.collect': boxHandler,
  'box.removeFromCollection': boxHandler,
  'box.delete': boxHandler,
  'collection.updateBoxFrame': boxHandler,
  'collection.updateView': boxHandler,
  'collection.arrange': boxHandler,
  'canvas.arrange': boxHandler,
  'system.constrainFrames': boxHandler,
  'item.paste': itemHandler,
  'item.create': itemHandler,
  'item.rename': itemHandler,
  'item.editContent': itemHandler,
  'item.setPinned': itemHandler,
  'item.reorder': itemHandler,
  'item.moveBetweenBoxes': itemHandler,
  'item.delete': itemHandler,
  'bookmark.setFavicon': itemHandler,
} satisfies Record<WorkspaceCommandType, DatabaseCommandHandler>);

export function getDatabaseCommandHandler(type: WorkspaceCommandType) {
  return databaseCommandRegistry[type];
}
