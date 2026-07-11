import { eq } from 'drizzle-orm';
import type { KhaosDatabase } from './createDatabaseClient';
import { APP_STATE_ID, PREFERENCES_ID, appState, boxes, pages, preferences } from './schema';
import { DATABASE_SCHEMA_VERSION } from './version';
import type { ColorMode, PreferenceLocale } from '../contracts/preferences';

export const COLLECTION_PAGE_ID = 'khaosbox-collection';
export const RECYCLE_BIN_PAGE_ID = 'khaosbox-recycle-bin';

export interface InitialWorkspacePreferences {
  locale: PreferenceLocale;
  colorMode: ColorMode;
}

export async function initializeWorkspaceDatabase(
  database: KhaosDatabase,
  initialPreferences: InitialWorkspacePreferences,
) {
  const existingState = await database
    .select({ id: appState.id })
    .from(appState)
    .where(eq(appState.id, APP_STATE_ID))
    .get();
  if (existingState) return;

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
  });
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
