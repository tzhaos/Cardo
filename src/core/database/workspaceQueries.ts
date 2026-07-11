import { asc, eq } from 'drizzle-orm';
import type { KhaosDatabase } from './createDatabaseClient';
import {
  appState,
  boxes,
  pages,
  pageSelectSchema,
  preferences,
  preferencesSelectSchema,
} from './schema';

export async function getPageTabs(database: KhaosDatabase) {
  const rows = await database.select().from(pages).orderBy(asc(pages.sortOrder)).all();
  return pageSelectSchema.array().parse(rows);
}

export async function getWorkspaceState(database: KhaosDatabase) {
  return await database.select().from(appState).limit(1).get();
}

export async function getPageBoxes(database: KhaosDatabase, pageId: string) {
  return await database
    .select()
    .from(boxes)
    .where(eq(boxes.pageId, pageId))
    .orderBy(asc(boxes.zIndex))
    .all();
}

export async function getPreferences(database: KhaosDatabase) {
  const row = await database.select().from(preferences).limit(1).get();
  return row ? preferencesSelectSchema.parse(row) : null;
}
