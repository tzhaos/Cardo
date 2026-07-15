import { asc, eq, inArray } from 'drizzle-orm';
import { workspaceProjectionSchema, type WorkspaceItem } from '../contracts/workspace';
import {
  boxItemsQuerySchema,
  pageBoxesQuerySchema,
  pageTabsQuerySchema,
  workspaceStateQuerySchema,
} from '../contracts/workspaceQueries';
import type { CardoDatabase } from './createDatabaseClient';
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

export async function getPageTabs(database: CardoDatabase) {
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

export async function getWorkspaceState(database: CardoDatabase) {
  const row = await database.select().from(appState).limit(1).get();
  if (!row) throw new Error('Cardo app state is not initialized.');
  const state = appStateSelectSchema.parse(row);
  return workspaceStateQuerySchema.parse({
    activePageId: state.activePageId,
    defaultPageId: state.defaultPageId,
  });
}

export async function getPageBoxes(database: CardoDatabase, pageId: string) {
  const boxRows = await database
    .select()
    .from(boxes)
    .where(eq(boxes.pageId, pageId))
    .orderBy(asc(boxes.zIndex))
    .all();
  const { itemRows, placementRows } = await selectBoxContents(
    database,
    boxRows.map((box) => box.id),
  );
  return pageBoxesQuerySchema.parse(projectWorkspaceBoxes(boxRows, itemRows, placementRows));
}

export async function getBoxItems(database: CardoDatabase, boxId: string) {
  const { itemRows, placementRows } = await selectBoxContents(database, [boxId]);
  const itemById = new Map(itemRows.map((item) => [item.id, item]));
  return boxItemsQuerySchema.parse(
    placementRows.flatMap((placement) => {
      const item = itemById.get(placement.itemId);
      return item ? [projectWorkspaceItem(item, placement.isPinned)] : [];
    }),
  );
}

export async function getPreferences(database: CardoDatabase) {
  const row = await database.select().from(preferences).limit(1).get();
  if (!row) return null;
  // Force classic shell: coerce any retired layout_profile_id before Zod parse.
  return preferencesSelectSchema.parse({
    ...row,
    layoutProfileId: 'classic',
  });
}

export async function getWorkspaceProjection(database: CardoDatabase) {
  const [state, pageRows, boxRows, itemRows, placementRows, collectionRows] = await Promise.all([
    getWorkspaceState(database),
    database.select().from(pages).orderBy(asc(pages.sortOrder)).all(),
    database.select().from(boxes).orderBy(asc(boxes.zIndex)).all(),
    database.select().from(items).all(),
    database.select().from(boxItems).orderBy(asc(boxItems.sortOrder)).all(),
    database.select().from(collectionBoxViews).orderBy(asc(collectionBoxViews.sortOrder)).all(),
  ]);

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
    boxes: projectWorkspaceBoxes(boxRows, itemRows, placementRows),
    collectionBoxIds: collectionRows.map((view) => view.boxId),
    collectionViews,
  });
}

async function selectBoxContents(database: CardoDatabase, boxIds: string[]) {
  if (!boxIds.length) {
    return {
      itemRows: [] as Array<typeof items.$inferSelect>,
      placementRows: [] as Array<typeof boxItems.$inferSelect>,
    };
  }

  const placementRows = await database
    .select()
    .from(boxItems)
    .where(inArray(boxItems.boxId, boxIds))
    .orderBy(asc(boxItems.sortOrder))
    .all();
  const itemIds = [...new Set(placementRows.map((placement) => placement.itemId))];
  const itemRows = itemIds.length
    ? await database.select().from(items).where(inArray(items.id, itemIds)).all()
    : [];
  return { itemRows, placementRows };
}

function projectWorkspaceBoxes(
  boxRows: Array<typeof boxes.$inferSelect>,
  itemRows: Array<typeof items.$inferSelect>,
  placementRows: Array<typeof boxItems.$inferSelect>,
) {
  const itemById = new Map(itemRows.map((item) => [item.id, item]));
  const placementsByBox = new Map<string, typeof placementRows>();
  for (const placement of placementRows) {
    const current = placementsByBox.get(placement.boxId) ?? [];
    current.push(placement);
    placementsByBox.set(placement.boxId, current);
  }

  return boxRows.map((box) => {
    const freeform = { x: box.x, y: box.y, width: box.width, height: box.height };
    return {
      id: box.id,
      pageId: box.pageId,
      kind: box.kind,
      title: box.title,
      frame: freeform,
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
    };
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
