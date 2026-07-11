import type { WorkspaceItem, WorkspaceSnapshot } from '../contracts/workspace';
import type { WorkspaceCommand } from '../contracts/workspaceCommands';
import {
  APP_STATE_ID,
  appState,
  boxes,
  boxItems,
  collectionBoxViews,
  items,
  pages,
} from '../database/schema';
import { DATABASE_SCHEMA_VERSION } from '../database/version';
import type {
  DatabaseCommandMutation,
  DatabaseTransaction,
} from './commandTypes';

export type WorkspaceImportCommand = Extract<WorkspaceCommand, { type: 'workspace.import' }>;

export async function executeWorkspaceImport(
  transaction: DatabaseTransaction,
  command: WorkspaceImportCommand,
): Promise<DatabaseCommandMutation> {
  const before = await readWorkspaceRows(transaction);
  const after = projectSnapshotRows(command.snapshot);
  const changes = buildImportChanges(before, after);

  await transaction.delete(collectionBoxViews);
  await transaction.delete(boxItems);
  await transaction.delete(items);
  await transaction.delete(boxes);
  await transaction.delete(appState);
  await transaction.delete(pages);

  await transaction.insert(pages).values(after.pages);
  if (after.boxes.length) await transaction.insert(boxes).values(after.boxes);
  if (after.items.length) await transaction.insert(items).values(after.items);
  if (after.boxItems.length) await transaction.insert(boxItems).values(after.boxItems);
  if (after.collectionViews.length) {
    await transaction.insert(collectionBoxViews).values(after.collectionViews);
  }
  await transaction.insert(appState).values(after.appState);

  return { changes };
}

async function readWorkspaceRows(transaction: DatabaseTransaction) {
  const [pageRows, boxRows, itemRows, placementRows, collectionRows, state] = await Promise.all([
    transaction.select().from(pages).all(),
    transaction.select().from(boxes).all(),
    transaction.select().from(items).all(),
    transaction.select().from(boxItems).all(),
    transaction.select().from(collectionBoxViews).all(),
    transaction.select().from(appState).get(),
  ]);
  if (!state) throw new Error('KhaosBox app state is not initialized.');
  return {
    pages: pageRows,
    boxes: boxRows,
    items: itemRows,
    boxItems: placementRows,
    collectionViews: collectionRows,
    appState: state,
  };
}

function projectSnapshotRows(snapshot: WorkspaceSnapshot) {
  const projectedItems: Array<typeof items.$inferInsert> = [];
  const placements: Array<typeof boxItems.$inferInsert> = [];
  const boxRows = snapshot.boxes.map((box, boxIndex) => {
    for (const [sortOrder, item] of box.items.entries()) {
      projectedItems.push(projectItem(item));
      placements.push({ boxId: box.id, itemId: item.id, sortOrder, isPinned: item.isPinned });
    }
    return {
      id: box.id,
      pageId: box.pageId,
      preset: box.preset,
      kind: box.kind,
      title: box.title,
      x: box.frame.x,
      y: box.frame.y,
      width: box.frame.width,
      height: box.frame.height,
      viewMode: box.viewMode,
      detailMode: box.detailMode,
      isLocked: box.isLocked,
      icon: box.icon ?? null,
      accent: box.accent ?? null,
      zIndex: boxIndex + 1,
      createdAt: box.createdAt,
      updatedAt: box.updatedAt,
    };
  });
  const collectionRows = snapshot.collectionBoxIds.map((boxId, index) => {
    const view = snapshot.collectionViews[boxId];
    if (!view) throw new Error(`Collection view for Box ${boxId} is missing.`);
    return {
      boxId,
      x: view.frame.x,
      y: view.frame.y,
      width: view.frame.width,
      height: view.frame.height,
      viewMode: view.viewMode,
      detailMode: view.detailMode,
      sortOrder: index,
    };
  });
  return {
    pages: snapshot.pages.map((page) => ({
      id: page.id,
      title: page.title,
      sortOrder: page.order,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    })),
    boxes: boxRows,
    items: projectedItems,
    boxItems: placements,
    collectionViews: collectionRows,
    appState: {
      id: APP_STATE_ID,
      schemaVersion: DATABASE_SCHEMA_VERSION,
      activePageId: snapshot.activePageId,
      defaultPageId: snapshot.defaultPageId,
    },
  };
}

function projectItem(item: WorkspaceItem): typeof items.$inferInsert {
  const common = {
    id: item.id,
    type: item.type,
    title: item.title,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
  if (item.type === 'bookmark') {
    return {
      ...common,
      content: item.url,
      metadata: { type: 'bookmark', ...(item.favicon ? { favicon: item.favicon } : {}) },
    };
  }
  if (item.type === 'clipboard') {
    return { ...common, content: item.text, metadata: { type: 'clipboard' } };
  }
  if (item.type === 'shortcut') {
    return {
      ...common,
      content: item.path,
      metadata: {
        type: 'shortcut',
        ...(item.targetType ? { targetType: item.targetType } : {}),
      },
    };
  }
  return { ...common, content: item.path, metadata: { type: item.type } };
}

function buildImportChanges(
  before: Awaited<ReturnType<typeof readWorkspaceRows>>,
  after: ReturnType<typeof projectSnapshotRows>,
) {
  return [
    ...diffRows('collection_box_views', before.collectionViews, after.collectionViews, (row) => ({
      boxId: row.boxId,
    })).filter((change) => change.after === null),
    ...diffRows('box_items', before.boxItems, after.boxItems, (row) => ({
      boxId: row.boxId,
      itemId: row.itemId,
    })).filter((change) => change.after === null),
    ...diffRows('items', before.items, after.items, (row) => ({ id: row.id })).filter(
      (change) => change.after === null,
    ),
    ...diffRows('boxes', before.boxes, after.boxes, (row) => ({ id: row.id })).filter(
      (change) => change.after === null,
    ),
    ...diffRows('pages', before.pages, after.pages, (row) => ({ id: row.id })).filter(
      (change) => change.after === null,
    ),
    ...diffRows('pages', before.pages, after.pages, (row) => ({ id: row.id })).filter(
      (change) => change.after !== null,
    ),
    ...diffRows('boxes', before.boxes, after.boxes, (row) => ({ id: row.id })).filter(
      (change) => change.after !== null,
    ),
    ...diffRows('items', before.items, after.items, (row) => ({ id: row.id })).filter(
      (change) => change.after !== null,
    ),
    ...diffRows('box_items', before.boxItems, after.boxItems, (row) => ({
      boxId: row.boxId,
      itemId: row.itemId,
    })).filter((change) => change.after !== null),
    ...diffRows('collection_box_views', before.collectionViews, after.collectionViews, (row) => ({
      boxId: row.boxId,
    })).filter((change) => change.after !== null),
    rowChange('app_state', { id: APP_STATE_ID }, before.appState, after.appState),
  ];
}

function diffRows<T extends Record<string, unknown>>(
  table: DatabaseCommandMutation['changes'][number]['table'],
  beforeRows: T[],
  afterRows: T[],
  keyOf: (row: T) => Record<string, string | number>,
) {
  const serializeKey = (key: Record<string, string | number>) => JSON.stringify(key);
  const beforeByKey = new Map(beforeRows.map((row) => [serializeKey(keyOf(row)), row]));
  const afterByKey = new Map(afterRows.map((row) => [serializeKey(keyOf(row)), row]));
  return [...new Set([...beforeByKey.keys(), ...afterByKey.keys()])].flatMap((key) => {
    const before = beforeByKey.get(key) ?? null;
    const after = afterByKey.get(key) ?? null;
    if (before && after && JSON.stringify(before) === JSON.stringify(after)) return [];
    return [rowChange(table, keyOf(before ?? after!), before, after)];
  });
}

function rowChange(
  table: DatabaseCommandMutation['changes'][number]['table'],
  key: Record<string, string | number>,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) {
  return { table, key, before, after };
}
