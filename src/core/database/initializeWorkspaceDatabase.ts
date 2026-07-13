import { eq } from 'drizzle-orm';
import type { CardoDatabase } from './createDatabaseClient';
import { bumpRevision } from './revision';
import {
  APP_STATE_ID,
  PREFERENCES_ID,
  appState,
  boxItems,
  boxes,
  items,
  pages,
  preferences,
} from './schema';
import { DATABASE_SCHEMA_VERSION } from './version';
import {
  DEFAULT_DENSITY,
  DEFAULT_FONT_FAMILY_ID,
  DEFAULT_FONT_SCALE,
  type ColorMode,
  type PreferenceLocale,
} from '../contracts/preferences';
import { COLLECTION_PAGE_ID, RECYCLE_BIN_PAGE_ID } from '../contracts/systemPages';
import { createWelcomeBoxFrame } from '../domains/layout/boxDefaults';
import { getWelcomeSeedCopy } from './welcomeSeed';

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
  const welcome = createWelcomeSeed(defaultPageId, timestamp, initialPreferences.locale);

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

    await transaction.insert(boxes).values(welcome.box);
    await transaction.insert(items).values(welcome.items);
    await transaction.insert(boxItems).values(welcome.placements);

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
      themeId: 'codex',
      fontFamily: DEFAULT_FONT_FAMILY_ID,
      fontScale: DEFAULT_FONT_SCALE,
      density: DEFAULT_DENSITY,
      // Empty customization keeps the official codex pack pixel-identical.
      themeColorOverrides: {},
      themeOptionValues: {},
      importedThemePacks: [],
      featureFlags: {},
      layoutProfileId: 'classic',
      cssSnippet: '',
      cssSnippetEnabled: false,
      searchEngine: 'bing-cn',
      customSearchTemplate: '',
    });

    // First seed is a mutating write: revision++ once; not undoable (no history_entries).
    await bumpRevision(transaction);
  });

  return { created: true };
}

function createWelcomeSeed(pageId: string, timestamp: string, locale: PreferenceLocale) {
  const copy = getWelcomeSeedCopy(locale);
  const frame = createWelcomeBoxFrame();
  const boxId = `box-${crypto.randomUUID()}`;
  const box = {
    id: boxId,
    pageId,
    kind: 'normal' as const,
    title: copy.boxTitle,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
    viewMode: 'list' as const,
    detailMode: 'detailed' as const,
    isLocked: false,
    icon: 'idea' as const,
    accent: '#3b82f6',
    zIndex: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const itemsRows = copy.tips.map((text) => ({
    id: `item-${crypto.randomUUID()}`,
    type: 'clipboard' as const,
    title: '',
    content: text,
    metadata: { type: 'clipboard' as const },
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  const placements = itemsRows.map((item, index) => ({
    boxId,
    itemId: item.id,
    sortOrder: index,
    isPinned: index === 0,
  }));

  return { box, items: itemsRows, placements };
}
