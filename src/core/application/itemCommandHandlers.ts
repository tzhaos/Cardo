import { asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { ItemMetadata, WorkspaceItemType } from '../contracts/workspace';
import type { WorkspaceCommand } from '../contracts/workspaceCommands';
import { APP_STATE_ID, appState, boxes, boxItems, items, pages } from '../database/schema';
import { COLLECTION_PAGE_ID, RECYCLE_BIN_PAGE_ID } from '../database/initializeWorkspaceDatabase';
import type { DatabaseCommandMutation, DatabaseTransaction } from './commandTypes';
import { chooseAvailableBoxAccent, DEFAULT_BOX_ICON } from '../domains/boxAppearance';

type ItemCommandType =
  | 'item.paste'
  | 'item.create'
  | 'item.rename'
  | 'item.editContent'
  | 'item.setPinned'
  | 'item.reorder'
  | 'item.moveBetweenBoxes'
  | 'item.delete'
  | 'bookmark.setFavicon';

export type ItemCommand = Extract<WorkspaceCommand, { type: ItemCommandType }>;

export async function executeItemCommand(
  transaction: DatabaseTransaction,
  command: ItemCommand,
): Promise<DatabaseCommandMutation> {
  switch (command.type) {
    case 'item.create':
      return createItemInBox(transaction, command.boxId, command.itemType, command.draft);
    case 'item.paste':
      return pasteItem(transaction, command);
    case 'item.rename':
      return renameItem(transaction, command.boxId, command.itemId, command.title);
    case 'item.editContent':
      return editItemContent(transaction, command.boxId, command.itemId, command.content);
    case 'item.setPinned':
      return setItemPinned(transaction, command.boxId, command.itemId, command.isPinned);
    case 'item.reorder':
      return reorderItems(transaction, command.boxId, command.orderedItemIds);
    case 'item.moveBetweenBoxes':
      return moveItemBetweenBoxes(transaction, command);
    case 'item.delete':
      return deleteItem(transaction, command.boxId, command.itemId);
    case 'bookmark.setFavicon':
      return setBookmarkFavicon(transaction, command.boxId, command.itemId, command.favicon);
  }
}

async function pasteItem(
  transaction: DatabaseTransaction,
  command: Extract<ItemCommand, { type: 'item.paste' }>,
) {
  if (command.pageId === COLLECTION_PAGE_ID || command.pageId === RECYCLE_BIN_PAGE_ID) {
    throw new Error('Items cannot be pasted into a system page.');
  }
  await requirePage(transaction, command.pageId);
  let targetBox = command.targetBoxId
    ? await transaction.select().from(boxes).where(eq(boxes.id, command.targetBoxId)).get()
    : undefined;
  const changes: DatabaseCommandMutation['changes'] = [];

  if (targetBox && targetBox.pageId !== command.pageId) {
    throw new Error('Paste target must belong to the requested page.');
  }

  if (!targetBox) {
    const pageBoxes = await transaction
      .select({ zIndex: boxes.zIndex, accent: boxes.accent })
      .from(boxes)
      .where(eq(boxes.pageId, command.pageId))
      .orderBy(desc(boxes.zIndex))
      .all();
    const timestamp = new Date().toISOString();
    targetBox = {
      id: `box-${crypto.randomUUID()}`,
      pageId: command.pageId,
      kind: 'temporary',
      title: '',
      x: command.temporaryFrame.x,
      y: command.temporaryFrame.y,
      width: command.temporaryFrame.width,
      height: command.temporaryFrame.height,
      viewMode: 'list',
      detailMode: 'detailed',
      isLocked: false,
      icon: DEFAULT_BOX_ICON,
      accent: chooseAvailableBoxAccent(pageBoxes.map((box) => box.accent)),
      zIndex: (pageBoxes[0]?.zIndex ?? 0) + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await transaction.insert(boxes).values(targetBox);
    changes.push(rowChange('boxes', { id: targetBox.id }, null, targetBox));
  }

  const itemMutation = await createItemInBox(
    transaction,
    targetBox.id,
    command.itemType,
    command.draft,
  );
  changes.push(...itemMutation.changes);

  const state = await requireAppState(transaction);
  if (state.activePageId !== command.pageId) {
    const stateAfter = { ...state, activePageId: command.pageId };
    await transaction
      .update(appState)
      .set({ activePageId: command.pageId })
      .where(eq(appState.id, APP_STATE_ID));
    changes.push(rowChange('app_state', { id: APP_STATE_ID }, state, stateAfter));
  }

  return {
    changes,
    result: {
      createdBoxId: targetBox.id,
      createdItemId: itemMutation.result?.createdItemId,
    },
  };
}

async function createItemInBox(
  transaction: DatabaseTransaction,
  boxId: string,
  type: WorkspaceItemType,
  draft: Record<string, string>,
) {
  const box = await requireBox(transaction, boxId);
  if (box.pageId === RECYCLE_BIN_PAGE_ID) throw new Error('Items cannot be added in Recycle Bin.');
  const item = createItemRow(type, draft);
  const placements = await selectPlacements(transaction, boxId);
  const insertionIndex = placements.filter((placement) => placement.isPinned).length;
  await transaction.insert(items).values(item);
  const changes = await rewritePlacements(
    transaction,
    placements,
    [
      ...placements.slice(0, insertionIndex).map((placement) => placement.itemId),
      item.id,
      ...placements.slice(insertionIndex).map((placement) => placement.itemId),
    ],
    new Map([[item.id, false]]),
    new Map([[item.id, null]]),
    boxId,
  );
  changes.unshift(rowChange('items', { id: item.id }, null, item));
  const boxAfter = { ...box, updatedAt: item.createdAt };
  await transaction.update(boxes).set({ updatedAt: item.createdAt }).where(eq(boxes.id, boxId));
  changes.push(rowChange('boxes', { id: boxId }, box, boxAfter));
  return {
    changes,
    result: { createdItemId: item.id },
  } satisfies DatabaseCommandMutation;
}

async function renameItem(
  transaction: DatabaseTransaction,
  boxId: string,
  itemId: string,
  title: string,
) {
  await requirePlacement(transaction, boxId, itemId);
  const item = await requireItem(transaction, itemId);
  const nextTitle = title.trim();
  if (item.title === nextTitle) return noMutation();
  return updateItemAndBox(transaction, boxId, item, { title: nextTitle });
}

async function editItemContent(
  transaction: DatabaseTransaction,
  boxId: string,
  itemId: string,
  content: string,
) {
  await requirePlacement(transaction, boxId, itemId);
  const item = await requireItem(transaction, itemId);
  const nextContent = content.trim();
  if (!nextContent || item.content === nextContent) return noMutation();
  const metadata: ItemMetadata = item.type === 'bookmark' ? { type: 'bookmark' } : item.metadata;
  return updateItemAndBox(transaction, boxId, item, { content: nextContent, metadata });
}

async function setBookmarkFavicon(
  transaction: DatabaseTransaction,
  boxId: string,
  itemId: string,
  favicon: string,
) {
  if (!favicon.startsWith('data:image/')) return noMutation();
  await requirePlacement(transaction, boxId, itemId);
  const item = await requireItem(transaction, itemId);
  if (item.type !== 'bookmark') throw new Error('Only bookmark items can store favicons.');
  const metadata: ItemMetadata = { type: 'bookmark', favicon };
  if (JSON.stringify(item.metadata) === JSON.stringify(metadata)) return noMutation();
  return updateItemAndBox(transaction, boxId, item, { metadata }, false);
}

async function updateItemAndBox(
  transaction: DatabaseTransaction,
  boxId: string,
  item: typeof items.$inferSelect,
  patch: Partial<typeof items.$inferInsert>,
  updateBoxTimestamp = true,
) {
  const timestamp = new Date().toISOString();
  const after = { ...item, ...patch, id: item.id, updatedAt: timestamp };
  await transaction.update(items).set(after).where(eq(items.id, item.id));
  const changes: DatabaseCommandMutation['changes'] = [
    rowChange('items', { id: item.id }, item, after),
  ];
  if (updateBoxTimestamp) {
    const box = await requireBox(transaction, boxId);
    const boxAfter = { ...box, updatedAt: timestamp };
    await transaction.update(boxes).set({ updatedAt: timestamp }).where(eq(boxes.id, boxId));
    changes.push(rowChange('boxes', { id: boxId }, box, boxAfter));
  }
  return { changes };
}

async function setItemPinned(
  transaction: DatabaseTransaction,
  boxId: string,
  itemId: string,
  isPinned: boolean,
) {
  const placements = await selectPlacements(transaction, boxId);
  const target = placements.find((placement) => placement.itemId === itemId);
  if (!target) throw new Error(`Item ${itemId} is not placed in Box ${boxId}.`);
  if (target.isPinned === isPinned) return noMutation();
  const pinState = new Map(placements.map((placement) => [placement.itemId, placement.isPinned]));
  pinState.set(itemId, isPinned);
  const orderedIds = [
    ...placements
      .filter((placement) => pinState.get(placement.itemId))
      .map((placement) => placement.itemId),
    ...placements
      .filter((placement) => !pinState.get(placement.itemId))
      .map((placement) => placement.itemId),
  ];
  const changes = await rewritePlacements(transaction, placements, orderedIds, pinState);
  changes.push(...(await touchBoxes(transaction, [boxId])));
  return { changes };
}

async function reorderItems(
  transaction: DatabaseTransaction,
  boxId: string,
  orderedItemIds: string[],
) {
  const placements = await selectPlacements(transaction, boxId);
  validateCompleteOrder(placements, orderedItemIds);
  const placementById = new Map(placements.map((placement) => [placement.itemId, placement]));
  const groupedIds = [
    ...orderedItemIds.filter((itemId) => placementById.get(itemId)!.isPinned),
    ...orderedItemIds.filter((itemId) => !placementById.get(itemId)!.isPinned),
  ];
  if (placements.every((placement, index) => placement.itemId === groupedIds[index])) {
    return noMutation();
  }
  const changes = await rewritePlacements(transaction, placements, groupedIds);
  changes.push(...(await touchBoxes(transaction, [boxId])));
  return { changes };
}

async function moveItemBetweenBoxes(
  transaction: DatabaseTransaction,
  command: Extract<ItemCommand, { type: 'item.moveBetweenBoxes' }>,
) {
  if (command.sourceBoxId === command.targetBoxId) return noMutation();
  const sourceBox = await requireBox(transaction, command.sourceBoxId);
  const targetBox = await requireBox(transaction, command.targetBoxId);
  const sourcePlacements = await selectPlacements(transaction, sourceBox.id);
  const targetPlacements = await selectPlacements(transaction, targetBox.id);
  const sourcePlacement = sourcePlacements.find((placement) => placement.itemId === command.itemId);
  if (!sourcePlacement) throw new Error('Source Box does not contain the requested Item.');
  const changes: DatabaseCommandMutation['changes'] = [];

  await transaction.delete(boxItems).where(eq(boxItems.itemId, command.itemId));
  changes.push(
    rowChange('box_items', { boxId: sourceBox.id, itemId: command.itemId }, sourcePlacement, null),
  );

  const remainingSource = sourcePlacements.filter(
    (placement) => placement.itemId !== command.itemId,
  );
  changes.push(
    ...(await rewritePlacements(
      transaction,
      remainingSource,
      remainingSource.map((placement) => placement.itemId),
    )),
  );

  const insertionIndex = clamp(
    command.targetIndex ?? targetPlacements.length,
    0,
    targetPlacements.length,
  );
  const targetIds = targetPlacements.map((placement) => placement.itemId);
  targetIds.splice(insertionIndex, 0, command.itemId);
  const targetPinState = new Map(
    targetPlacements.map((placement) => [placement.itemId, placement.isPinned]),
  );
  targetPinState.set(command.itemId, sourcePlacement.isPinned);
  const groupedTargetIds = [
    ...targetIds.filter((itemId) => targetPinState.get(itemId)),
    ...targetIds.filter((itemId) => !targetPinState.get(itemId)),
  ];
  changes.push(
    ...(await rewritePlacements(
      transaction,
      targetPlacements,
      groupedTargetIds,
      targetPinState,
      new Map([[command.itemId, null]]),
      targetBox.id,
    )),
  );

  if (sourceBox.kind === 'temporary' && remainingSource.length === 0) {
    await transaction.delete(boxes).where(eq(boxes.id, sourceBox.id));
    changes.push(rowChange('boxes', { id: sourceBox.id }, sourceBox, null));
    changes.push(...(await touchBoxes(transaction, [targetBox.id])));
  } else {
    changes.push(...(await touchBoxes(transaction, [sourceBox.id, targetBox.id])));
  }
  return { changes };
}

async function deleteItem(transaction: DatabaseTransaction, boxId: string, itemId: string) {
  const box = await requireBox(transaction, boxId);
  const item = await requireItem(transaction, itemId);
  const placements = await selectPlacements(transaction, boxId);
  const placement = placements.find((candidate) => candidate.itemId === itemId);
  if (!placement) throw new Error(`Item ${itemId} is not placed in Box ${boxId}.`);
  await transaction.delete(boxItems).where(eq(boxItems.itemId, itemId));
  await transaction.delete(items).where(eq(items.id, itemId));
  const changes: DatabaseCommandMutation['changes'] = [
    rowChange('box_items', { boxId, itemId }, placement, null),
    rowChange('items', { id: itemId }, item, null),
  ];
  const remaining = placements.filter((candidate) => candidate.itemId !== itemId);
  changes.push(
    ...(await rewritePlacements(
      transaction,
      remaining,
      remaining.map((candidate) => candidate.itemId),
    )),
  );
  if (box.kind === 'temporary' && remaining.length === 0) {
    await transaction.delete(boxes).where(eq(boxes.id, boxId));
    changes.push(rowChange('boxes', { id: boxId }, box, null));
  } else {
    changes.push(...(await touchBoxes(transaction, [boxId])));
  }
  return { changes };
}

async function rewritePlacements(
  transaction: DatabaseTransaction,
  existing: Array<typeof boxItems.$inferSelect>,
  orderedItemIds: string[],
  pinState = new Map(existing.map((placement) => [placement.itemId, placement.isPinned])),
  insertedItems = new Map<string, null>(),
  explicitBoxId?: string,
) {
  const boxId = explicitBoxId ?? existing[0]?.boxId;
  if (!boxId && orderedItemIds.length) {
    throw new Error('Placement rewrite requires a target Box.');
  }
  if (existing.length) {
    await transaction
      .update(boxItems)
      .set({ sortOrder: sql`${boxItems.sortOrder} + 100000` })
      .where(
        inArray(
          boxItems.itemId,
          existing.map((placement) => placement.itemId),
        ),
      );
  }
  const existingById = new Map(existing.map((placement) => [placement.itemId, placement]));
  const changes: DatabaseCommandMutation['changes'] = [];
  for (const [sortOrder, itemId] of orderedItemIds.entries()) {
    const before = existingById.get(itemId);
    const after = {
      boxId: boxId!,
      itemId,
      sortOrder,
      isPinned: pinState.get(itemId) ?? false,
    };
    if (before) {
      await transaction
        .update(boxItems)
        .set({ sortOrder, isPinned: after.isPinned, boxId: after.boxId })
        .where(eq(boxItems.itemId, itemId));
      if (
        before.sortOrder !== sortOrder ||
        before.isPinned !== after.isPinned ||
        before.boxId !== after.boxId
      ) {
        changes.push(rowChange('box_items', { boxId: before.boxId, itemId }, before, after));
      }
    } else if (insertedItems.has(itemId)) {
      await transaction.insert(boxItems).values(after);
      changes.push(rowChange('box_items', { boxId: after.boxId, itemId }, null, after));
    }
  }
  return changes;
}

async function touchBoxes(transaction: DatabaseTransaction, boxIds: string[]) {
  const timestamp = new Date().toISOString();
  const currentBoxes = await transaction
    .select()
    .from(boxes)
    .where(inArray(boxes.id, boxIds))
    .all();
  const changes: DatabaseCommandMutation['changes'] = [];
  for (const box of currentBoxes) {
    const after = { ...box, updatedAt: timestamp };
    await transaction.update(boxes).set({ updatedAt: timestamp }).where(eq(boxes.id, box.id));
    changes.push(rowChange('boxes', { id: box.id }, box, after));
  }
  return changes;
}

async function selectPlacements(transaction: DatabaseTransaction, boxId: string) {
  return await transaction
    .select()
    .from(boxItems)
    .where(eq(boxItems.boxId, boxId))
    .orderBy(asc(boxItems.sortOrder))
    .all();
}

async function requirePlacement(transaction: DatabaseTransaction, boxId: string, itemId: string) {
  const placement = await transaction
    .select()
    .from(boxItems)
    .where(eq(boxItems.itemId, itemId))
    .get();
  if (!placement || placement.boxId !== boxId) {
    throw new Error(`Item ${itemId} is not placed in Box ${boxId}.`);
  }
  return placement;
}

async function requireItem(transaction: DatabaseTransaction, itemId: string) {
  const item = await transaction.select().from(items).where(eq(items.id, itemId)).get();
  if (!item) throw new Error(`Item ${itemId} does not exist.`);
  return item;
}

async function requireBox(transaction: DatabaseTransaction, boxId: string) {
  const box = await transaction.select().from(boxes).where(eq(boxes.id, boxId)).get();
  if (!box) throw new Error(`Box ${boxId} does not exist.`);
  return box;
}

async function requirePage(transaction: DatabaseTransaction, pageId: string) {
  const page = await transaction.select().from(pages).where(eq(pages.id, pageId)).get();
  if (!page) throw new Error(`Page ${pageId} does not exist.`);
  return page;
}

async function requireAppState(transaction: DatabaseTransaction) {
  const state = await transaction
    .select()
    .from(appState)
    .where(eq(appState.id, APP_STATE_ID))
    .get();
  if (!state) throw new Error('KhaosBox app state is not initialized.');
  return state;
}

function createItemRow(type: WorkspaceItemType, draft: Record<string, string>) {
  const content = getDraftContent(type, draft).trim();
  if (!content) throw new Error(`Item content is required for ${type}.`);
  const timestamp = new Date().toISOString();
  return {
    id: `item-${crypto.randomUUID()}`,
    type,
    title: type === 'clipboard' ? '' : draft.title?.trim() || deriveTitle(type, content),
    content,
    metadata: createMetadata(type, draft),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function getDraftContent(type: WorkspaceItemType, draft: Record<string, string>) {
  if (type === 'bookmark') return draft.url ?? '';
  if (type === 'clipboard') return draft.text ?? '';
  return draft.path ?? '';
}

function createMetadata(type: WorkspaceItemType, draft: Record<string, string>): ItemMetadata {
  if (type === 'shortcut') {
    const targetType = draft.targetType;
    return targetType === 'file' || targetType === 'folder' || targetType === 'application'
      ? { type, targetType }
      : { type };
  }
  return { type };
}

function deriveTitle(type: WorkspaceItemType, content: string) {
  if (type === 'bookmark') {
    try {
      return new URL(content).hostname.replace(/^www\./, '') || content;
    } catch {
      return content;
    }
  }
  const segments = content.replace(/[\\/]+$/, '').split(/[\\/]/);
  return segments.at(-1) || content;
}

function validateCompleteOrder(
  placements: Array<typeof boxItems.$inferSelect>,
  orderedItemIds: string[],
) {
  const currentIds = placements.map((placement) => placement.itemId);
  if (
    orderedItemIds.length !== currentIds.length ||
    new Set(orderedItemIds).size !== orderedItemIds.length ||
    orderedItemIds.some((itemId) => !currentIds.includes(itemId))
  ) {
    throw new Error('Item reorder must contain every Box Item exactly once.');
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function rowChange(
  table: DatabaseCommandMutation['changes'][number]['table'],
  key: Record<string, string | number>,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) {
  return { table, key, before, after };
}

function noMutation(): DatabaseCommandMutation {
  return { changes: [] };
}
