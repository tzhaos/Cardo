import { asc } from 'drizzle-orm';
import { workspaceProjectionSchema, type WorkspaceItem } from '../contracts/workspace';
import {
  boxItemsQuerySchema,
  pageBoxesQuerySchema,
  pageTabsQuerySchema,
  workspaceStateQuerySchema,
} from '../contracts/workspaceQueries';
import type { KhaosDatabase } from './createDatabaseClient';
import {
  appState,
  appStateSelectSchema,
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
  return pageTabsQuerySchema.parse(
    pageSelectSchema
      .array()
      .parse(rows)
      .map((page) => ({
        id: page.id,
        title: page.title,
        order: page.sortOrder,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      })),
  );
}

export async function getWorkspaceState(database: KhaosDatabase) {
  const row = await database.select().from(appState).limit(1).get();
  if (!row) throw new Error('KhaosBox app state is not initialized.');
  const state = appStateSelectSchema.parse(row);
  return workspaceStateQuerySchema.parse({
    activePageId: state.activePageId,
    defaultPageId: state.defaultPageId,
  });
}

export async function getPageBoxes(database: KhaosDatabase, pageId: string) {
  const projection = await getWorkspaceProjection(database);
  return pageBoxesQuerySchema.parse(projection.boxes.filter((box) => box.pageId === pageId));
}

export async function getBoxItems(database: KhaosDatabase, boxId: string) {
  const projection = await getWorkspaceProjection(database);
  return boxItemsQuerySchema.parse(projection.boxes.find((box) => box.id === boxId)?.items ?? []);
}

export async function getPreferences(database: KhaosDatabase) {
  const row = await database.select().from(preferences).limit(1).get();
  return row ? preferencesSelectSchema.parse(row) : null;
}

export async function getWorkspaceProjection(database: KhaosDatabase) {
  const [state, pageRows, boxRows, itemRows, placementRows, collectionRows] = await Promise.all([
    getWorkspaceState(database),
    database.select().from(pages).orderBy(asc(pages.sortOrder)).all(),
    database.select().from(boxes).orderBy(asc(boxes.zIndex)).all(),
    database.select().from(items).all(),
    database.select().from(boxItems).orderBy(asc(boxItems.sortOrder)).all(),
    database.select().from(collectionBoxViews).orderBy(asc(collectionBoxViews.sortOrder)).all(),
  ]);

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

  return workspaceProjectionSchema.parse({
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
      kind: box.kind,
      title: box.title,
      frame: { x: box.x, y: box.y, width: box.width, height: box.height },
      items: (placementsByBox.get(box.id) ?? []).flatMap((placement) => {
        const item = itemById.get(placement.itemId);
        return item ? [projectWorkspaceItem(item, placement.isPinned)] : [];
      }),
      viewMode: box.viewMode,
      detailMode: box.detailMode,
      isLocked: box.isLocked,
      icon: box.icon,
      accent: box.accent,
      createdAt: box.createdAt,
      updatedAt: box.updatedAt,
    })),
    collectionBoxIds: collectionRows.map((view) => view.boxId),
    collectionViews,
  });
}

export function projectWorkspaceItem(
  item: typeof items.$inferSelect,
  isPinned: boolean,
): WorkspaceItem {
  const base = {
    id: item.id,
    title: item.title,
    isPinned,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
  if (item.type === 'bookmark') {
    const metadata =
      item.metadata.type === 'bookmark' ? item.metadata : { type: 'bookmark' as const };
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
    const metadata =
      item.metadata.type === 'shortcut' ? item.metadata : { type: 'shortcut' as const };
    return {
      ...base,
      type: 'shortcut',
      path: item.content,
      ...(metadata.targetType ? { targetType: metadata.targetType } : {}),
    };
  }
  return { ...base, type: item.type, path: item.content };
}
