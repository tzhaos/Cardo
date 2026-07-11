import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { historyChangeSetSchema, type HistoryChangeSet } from '../contracts/workspace';
import type { KhaosDatabase } from '../database/createDatabaseClient';
import {
  appState,
  appStateSelectSchema,
  boxes,
  boxItems,
  boxItemSelectSchema,
  boxSelectSchemaStrict,
  collectionBoxViews,
  collectionBoxViewSelectSchema,
  historyEntries,
  items,
  itemSelectSchema,
  operationLog,
  pages,
  pageSelectSchema,
  preferences,
  preferencesSelectSchema,
} from '../database/schema';
import type { DatabaseTransaction } from './commandTypes';

export async function undoDatabaseCommand(database: KhaosDatabase) {
  return database.transaction(async (transaction) => {
    const entry = await transaction
      .select()
      .from(historyEntries)
      .where(eq(historyEntries.state, 'applied'))
      .orderBy(desc(historyEntries.createdAt))
      .limit(1)
      .get();
    if (!entry) return false;

    const changes = historyChangeSetSchema.parse(entry.changes);
    await applyChangeSet(transaction, [...changes].reverse(), 'undo');
    const timestamp = new Date().toISOString();
    await transaction
      .update(historyEntries)
      .set({ state: 'undone', updatedAt: timestamp })
      .where(eq(historyEntries.id, entry.id));
    await transaction.insert(operationLog).values({
      id: crypto.randomUUID(),
      transactionId: crypto.randomUUID(),
      commandType: 'history.undo',
      commandPayload: { relatedTransactionId: entry.transactionId },
      source: 'undo',
      undoable: false,
      createdAt: timestamp,
    });
    return true;
  });
}

export async function redoDatabaseCommand(database: KhaosDatabase) {
  return database.transaction(async (transaction) => {
    const entry = await transaction
      .select()
      .from(historyEntries)
      .where(eq(historyEntries.state, 'undone'))
      .orderBy(desc(historyEntries.updatedAt))
      .limit(1)
      .get();
    if (!entry) return false;

    const changes = historyChangeSetSchema.parse(entry.changes);
    await applyChangeSet(transaction, changes, 'redo');
    const timestamp = new Date().toISOString();
    await transaction
      .update(historyEntries)
      .set({ state: 'applied', updatedAt: timestamp })
      .where(eq(historyEntries.id, entry.id));
    await transaction.insert(operationLog).values({
      id: crypto.randomUUID(),
      transactionId: crypto.randomUUID(),
      commandType: 'history.redo',
      commandPayload: { relatedTransactionId: entry.transactionId },
      source: 'redo',
      undoable: false,
      createdAt: timestamp,
    });
    return true;
  });
}

export async function getDatabaseHistoryState(database: KhaosDatabase) {
  const [undoEntry, redoEntry] = await Promise.all([
    database
      .select({ id: historyEntries.id })
      .from(historyEntries)
      .where(eq(historyEntries.state, 'applied'))
      .limit(1)
      .get(),
    database
      .select({ id: historyEntries.id })
      .from(historyEntries)
      .where(eq(historyEntries.state, 'undone'))
      .limit(1)
      .get(),
  ]);
  return { canUndo: Boolean(undoEntry), canRedo: Boolean(redoEntry) };
}

async function applyChangeSet(
  transaction: DatabaseTransaction,
  changes: HistoryChangeSet,
  direction: 'undo' | 'redo',
) {
  const pageIds = changes.flatMap((change) =>
    change.table === 'pages' && (direction === 'undo' ? change.after : change.before)
      ? [requireStringKey(change.key, 'id')]
      : [],
  );
  if (pageIds.length) {
    await transaction
      .update(pages)
      .set({ sortOrder: sql`${pages.sortOrder} + 100000` })
      .where(inArray(pages.id, pageIds));
  }

  const placementItemIds = changes.flatMap((change) => {
    if (change.table !== 'box_items') return [];
    const current = direction === 'undo' ? change.after : change.before;
    return current ? [requireStringKey(change.key, 'itemId')] : [];
  });
  if (placementItemIds.length) {
    await transaction
      .update(boxItems)
      .set({ sortOrder: sql`${boxItems.sortOrder} + 100000` })
      .where(inArray(boxItems.itemId, placementItemIds));
  }

  for (const change of changes) {
    const current = direction === 'undo' ? change.after : change.before;
    const target = direction === 'undo' ? change.before : change.after;
    await applyRowChange(transaction, change.table, change.key, current, target);
  }
}

async function applyRowChange(
  transaction: DatabaseTransaction,
  table: HistoryChangeSet[number]['table'],
  key: Record<string, string | number>,
  current: Record<string, unknown> | null,
  target: Record<string, unknown> | null,
) {
  switch (table) {
    case 'app_state': {
      const id = requireNumberKey(key, 'id');
      if (!target) return void (await transaction.delete(appState).where(eq(appState.id, id)));
      const row = appStateSelectSchema.parse(target);
      if (!current) return void (await transaction.insert(appState).values(row));
      return void (await transaction.update(appState).set(row).where(eq(appState.id, id)));
    }
    case 'pages': {
      const id = requireStringKey(key, 'id');
      if (!target) return void (await transaction.delete(pages).where(eq(pages.id, id)));
      const row = pageSelectSchema.parse(target);
      if (!current) return void (await transaction.insert(pages).values(row));
      return void (await transaction.update(pages).set(row).where(eq(pages.id, id)));
    }
    case 'boxes': {
      const id = requireStringKey(key, 'id');
      if (!target) return void (await transaction.delete(boxes).where(eq(boxes.id, id)));
      const row = boxSelectSchemaStrict.parse(target);
      if (!current) return void (await transaction.insert(boxes).values(row));
      return void (await transaction.update(boxes).set(row).where(eq(boxes.id, id)));
    }
    case 'items': {
      const id = requireStringKey(key, 'id');
      if (!target) return void (await transaction.delete(items).where(eq(items.id, id)));
      const row = itemSelectSchema.parse(target);
      if (!current) return void (await transaction.insert(items).values(row));
      return void (await transaction.update(items).set(row).where(eq(items.id, id)));
    }
    case 'box_items': {
      const boxId = requireStringKey(key, 'boxId');
      const itemId = requireStringKey(key, 'itemId');
      const predicate = and(eq(boxItems.boxId, boxId), eq(boxItems.itemId, itemId));
      if (!target) return void (await transaction.delete(boxItems).where(predicate));
      const row = boxItemSelectSchema.parse(target);
      if (!current) return void (await transaction.insert(boxItems).values(row));
      return void (await transaction.update(boxItems).set(row).where(predicate));
    }
    case 'collection_box_views': {
      const boxId = requireStringKey(key, 'boxId');
      if (!target) {
        return void (await transaction
          .delete(collectionBoxViews)
          .where(eq(collectionBoxViews.boxId, boxId)));
      }
      const row = collectionBoxViewSelectSchema.parse(target);
      if (!current) return void (await transaction.insert(collectionBoxViews).values(row));
      return void (await transaction
        .update(collectionBoxViews)
        .set(row)
        .where(eq(collectionBoxViews.boxId, boxId)));
    }
    case 'preferences': {
      const id = requireNumberKey(key, 'id');
      if (!target) return void (await transaction.delete(preferences).where(eq(preferences.id, id)));
      const row = preferencesSelectSchema.parse(target);
      if (!current) return void (await transaction.insert(preferences).values(row));
      return void (await transaction.update(preferences).set(row).where(eq(preferences.id, id)));
    }
  }
}

function requireStringKey(key: Record<string, string | number>, field: string) {
  const value = key[field];
  if (typeof value !== 'string') throw new Error(`History key ${field} must be a string.`);
  return value;
}

function requireNumberKey(key: Record<string, string | number>, field: string) {
  const value = key[field];
  if (typeof value !== 'number') throw new Error(`History key ${field} must be a number.`);
  return value;
}
