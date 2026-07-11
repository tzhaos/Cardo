import { eq } from 'drizzle-orm';
import type { CardoDatabase } from './createDatabaseClient';
import { bumpRevision } from './revision';
import { APP_STATE_ID, PREFERENCES_ID, appState, boxes, pages, preferences } from './schema';
import { DATABASE_SCHEMA_VERSION } from './version';
import type { ColorMode, PreferenceLocale } from '../contracts/preferences';
import { COLLECTION_PAGE_ID, RECYCLE_BIN_PAGE_ID } from '../contracts/systemPages';

export interface InitialWorkspacePreferences {
  locale: PreferenceLocale;
  colorMode: ColorMode;
}

/**
 * Seed workspace when app_state is missing. Idempotent no-op when already initialized
 * (no revision bump). First write bumps revision once in the same transaction
 * (design §6.8.1 ensureInitialized; no history_entries for seed).
 *
 * Returns whether this call created the workspace seed.
 */
export async function initializeWorkspaceDatabase(
  database: CardoDatabase,
  initialPreferences: InitialWorkspacePreferences,
): Promise<{ created: boolean }> {
  const existingState = await database
    .select({ id: appState.id })
    .from(appState)
    .where(eq(appState.id, APP_STATE_ID))
    .get();
  if (existingState) return { created: false };

  const timestamp = new Date().toISOString();
  const defaultPageId = `page-${crypto.randomUUID()}`;
  const personalPageId = `page-${crypto.randomUUID()}`;
  const inspirationPageId = `page-${crypto.randomUUID()}`;

  await database.transaction(async (transaction) => {
    await transaction.insert(pages).values([
      {
        id: COLLECTION_PAGE_ID,
        title: 'Collection',
        sortOrder: -1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: defaultPageId,
        title: 'Workspaces',
        sortOrder: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: personalPageId,
        title: 'Personal',
        sortOrder: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: inspirationPageId,
        title: 'Inspiration',
        sortOrder: 2,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: RECYCLE_BIN_PAGE_ID,
        title: 'Recycle Bin',
        sortOrder: 3,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);

    await transaction.insert(boxes).values(createInitialBox(defaultPageId, timestamp));

    await transaction.insert(appState).values({
      id: APP_STATE_ID,
      schemaVersion: DATABASE_SCHEMA_VERSION,
      activePageId: defaultPageId,
      defaultPageId,
    });

    await transaction.insert(preferences).values({
      id: PREFERENCES_ID,
      locale: initialPreferences.locale,
      colorMode: initialPreferences.colorMode,
      themeId: 'classic',
      searchEngine: 'bing-cn',
      customSearchTemplate: '',
    });

    // First seed is a mutating write: revision++ once; not undoable (no history_entries).
    await bumpRevision(transaction);
  });

  return { created: true };
}

function createInitialBox(pageId: string, timestamp: string) {
  return {
    id: `box-${crypto.randomUUID()}`,
    pageId,
    kind: 'normal' as const,
    title: 'Box',
    x: 120,
    y: 130,
    width: 320,
    height: 240,
    viewMode: 'list' as const,
    detailMode: 'detailed' as const,
    isLocked: false,
    icon: 'box' as const,
    accent: '#3b82f6',
    zIndex: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
