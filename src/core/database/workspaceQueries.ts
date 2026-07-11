import { asc, eq } from 'drizzle-orm';
import { workspaceSnapshotSchema, type WorkspaceItem } from '../contracts/workspace';
import type { KhaosDatabase } from './createDatabaseClient';
import {
  appState,
  boxes,
  pages,
  pageSelectSchema,
  preferences,
  preferencesSelectSchema,
  boxItems,
  collectionBoxViews,
  items,
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

export async function getWorkspaceSnapshot(database: KhaosDatabase) {
  const [state, pageRows, boxRows, itemRows, placementRows, collectionRows] = await Promise.all([
    getWorkspaceState(database),
    database.select().from(pages).orderBy(asc(pages.sortOrder)).all(),
    database.select().from(boxes).orderBy(asc(boxes.zIndex)).all(),
    database.select().from(items).all(),
    database.select().from(boxItems).orderBy(asc(boxItems.sortOrder)).all(),
    database
      .select()
      .from(collectionBoxViews)
      .orderBy(asc(collectionBoxViews.sortOrder))
      .all(),
  ]);
  if (!state) throw new Error('KhaosBox app state is not initialized.');

  const itemById = new Map(itemRows.map((item) => [item.id, item]));
  const placementsByBox = new Map<string, typeof placementRows>();
  for (const placement of placementRows) {
    const current = placementsByBox.get(placement.boxId) ?? [];
    current.push(placement);
    placementsByBox.set(placement.boxId, current);
  }

  const collectionViews = Object.fromEntries(
    collectionRows.map((view) => [
      view.boxId,
      {
        boxId: view.boxId,
        frame: { x: view.x, y: view.y, width: view.width, height: view.height },
        viewMode: view.viewMode,
        detailMode: view.detailMode,
        order: view.sortOrder,
      },
    ]),
  );

  return workspaceSnapshotSchema.parse({
    pages: pageRows.map((page) => ({
      id: page.id,
      title: page.title,
      order: page.sortOrder,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    })),
    activePageId: state.activePageId,
    defaultPageId: state.defaultPageId,
    boxes: boxRows.map((box) => ({
      id: box.id,
      pageId: box.pageId,
      preset: box.preset,
      kind: box.kind,
      title: box.title,
      frame: { x: box.x, y: box.y, width: box.width, height: box.height },
      items: (placementsByBox.get(box.id) ?? []).flatMap((placement) => {
        const item = itemById.get(placement.itemId);
        return item ? [projectItem(item, placement.isPinned)] : [];
      }),
      viewMode: box.viewMode,
      detailMode: box.detailMode,
      isLocked: box.isLocked,
      ...(box.icon ? { icon: box.icon } : {}),
      ...(box.accent ? { accent: box.accent } : {}),
      createdAt: box.createdAt,
      updatedAt: box.updatedAt,
    })),
    collectionBoxIds: collectionRows.map((view) => view.boxId),
    collectionViews,
  });
}

function projectItem(item: typeof items.$inferSelect, isPinned: boolean): WorkspaceItem {
  const base = {
    id: item.id,
    title: item.title,
    isPinned,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
  if (item.type === 'bookmark') {
    const metadata = item.metadata.type === 'bookmark' ? item.metadata : { type: 'bookmark' as const };
    return {
      ...base,
      type: 'bookmark',
      url: item.content,
      ...(metadata.favicon ? { favicon: metadata.favicon } : {}),
    };
  }
  if (item.type === 'clipboard') {
    return { ...base, type: 'clipboard', text: item.content };
  }
  if (item.type === 'shortcut') {
    const metadata = item.metadata.type === 'shortcut' ? item.metadata : { type: 'shortcut' as const };
    return {
      ...base,
      type: 'shortcut',
      path: item.content,
      ...(metadata.targetType ? { targetType: metadata.targetType } : {}),
    };
  }
  return { ...base, type: item.type, path: item.content };
}
