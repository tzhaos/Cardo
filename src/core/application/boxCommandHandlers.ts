import { asc, desc, eq, inArray } from 'drizzle-orm';
import type { BoxFrame } from '../contracts/workspace';
import type { WorkspaceCommand } from '../contracts/workspaceCommands';
import { COLLECTION_PAGE_ID, RECYCLE_BIN_PAGE_ID } from '../contracts/systemPages';
import {
  APP_STATE_ID,
  appState,
  boxes,
  boxItems,
  collectionBoxViews,
  items,
  pages,
} from '../database/schema';
import type { DatabaseCommandMutation, DatabaseTransaction } from './commandTypes';
import { DomainCommandError } from './domainError';
import { rowChange } from './historyChanges';
import {
  chooseAvailableBoxAccent,
  DEFAULT_BOX_ACCENT,
  DEFAULT_BOX_ICON,
} from '../domains/boxAppearance';

type BoxCommandType =
  | 'box.create'
  | 'box.updateFrame'
  | 'box.rename'
  | 'box.promote'
  | 'box.setDetailMode'
  | 'box.setLocked'
  | 'box.setAppearance'
  | 'box.setViewMode'
  | 'box.moveToPage'
  | 'box.collect'
  | 'box.removeFromCollection'
  | 'box.delete'
  | 'collection.updateBoxFrame'
  | 'collection.updateView'
  | 'collection.arrange'
  | 'canvas.arrange'
  | 'system.constrainFrames';

export type BoxCommand = Extract<WorkspaceCommand, { type: BoxCommandType }>;

export async function executeBoxCommand(
  transaction: DatabaseTransaction,
  command: BoxCommand,
): Promise<DatabaseCommandMutation> {
  switch (command.type) {
    case 'box.create':
      return createBox(transaction, command);
    case 'box.updateFrame':
      return updateBox(transaction, command.boxId, frameColumns(command.frame));
    case 'box.rename':
      return renameBox(transaction, command.boxId, command.title);
    case 'box.promote':
      return promoteBox(transaction, command.boxId, command.title);
    case 'box.setDetailMode':
      return updateBox(transaction, command.boxId, { detailMode: command.detailMode });
    case 'box.setLocked':
      return updateBox(transaction, command.boxId, { isLocked: command.isLocked });
    case 'box.setAppearance':
      // Icons may change; accent is always product default gray (no custom colors).
      return updateBox(transaction, command.boxId, {
        ...(command.icon ? { icon: command.icon } : {}),
        accent: DEFAULT_BOX_ACCENT,
      });
    case 'box.setViewMode':
      return updateBox(transaction, command.boxId, { viewMode: command.viewMode });
    case 'box.moveToPage':
      return moveBoxToPage(transaction, command.boxId, command.pageId, command.frame);
    case 'box.collect':
      return collectBox(transaction, command.boxId);
    case 'box.removeFromCollection':
      return removeBoxFromCollection(transaction, command.boxId);
    case 'box.delete':
      return deleteBox(transaction, command.boxId);
    case 'collection.updateBoxFrame':
      return updateCollectionView(transaction, command.boxId, frameColumns(command.frame));
    case 'collection.updateView':
      return updateCollectionView(transaction, command.boxId, {
        ...(command.patch.viewMode ? { viewMode: command.patch.viewMode } : {}),
        ...(command.patch.detailMode ? { detailMode: command.patch.detailMode } : {}),
        ...(command.patch.order !== undefined ? { sortOrder: command.patch.order } : {}),
      });
    case 'collection.arrange':
      return arrangeCollection(transaction, command.frames);
    case 'canvas.arrange':
      return arrangePage(
        transaction,
        command.pageId,
        command.frames,
        command.layoutMode ?? 'freeform',
      );
    case 'system.constrainFrames':
      return constrainFrames(transaction, command.viewport);
  }
}

async function createBox(
  transaction: DatabaseTransaction,
  command: Extract<BoxCommand, { type: 'box.create' }>,
) {
  await requireNormalPage(transaction, command.pageId);
  const pageBoxes = await transaction
    .select()
    .from(boxes)
    .where(eq(boxes.pageId, command.pageId))
    .orderBy(desc(boxes.zIndex))
    .all();
  const timestamp = new Date().toISOString();
  const boxId = `box-${crypto.randomUUID()}`;
  const accent = chooseAvailableBoxAccent(pageBoxes.map((box) => box.accent));
  const freeform = frameColumns(command.frame);
  const box = {
    id: boxId,
    pageId: command.pageId,
    kind: 'normal' as const,
    title: command.title?.trim() || 'New Box',
    ...freeform,
    viewMode: 'list' as const,
    detailMode: 'detailed' as const,
    isLocked: false,
    icon: DEFAULT_BOX_ICON,
    accent,
    zIndex: (pageBoxes[0]?.zIndex ?? 0) + 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await transaction.insert(boxes).values(box);
  return {
    result: { createdBoxId: boxId },
    changes: [rowChange('boxes', { id: boxId }, null, box)],
  } satisfies DatabaseCommandMutation;
}

async function updateBox(
  transaction: DatabaseTransaction,
  boxId: string,
  patch: Partial<typeof boxes.$inferInsert>,
) {
  const before = await requireBox(transaction, boxId);
  const after = { ...before, ...patch, id: before.id, updatedAt: new Date().toISOString() };
  if (rowsEqual(before, after, ['updatedAt'])) return noMutation();
  await transaction.update(boxes).set(after).where(eq(boxes.id, boxId));
  return { changes: [rowChange('boxes', { id: boxId }, before, after)] };
}

async function renameBox(transaction: DatabaseTransaction, boxId: string, title: string) {
  const nextTitle = title.trim();
  if (!nextTitle) return noMutation();
  return updateBox(transaction, boxId, { title: nextTitle });
}

async function promoteBox(transaction: DatabaseTransaction, boxId: string, title: string) {
  const box = await requireBox(transaction, boxId);
  if (box.kind !== 'temporary' || !title.trim()) return noMutation();
  return updateBox(transaction, boxId, { kind: 'normal', title: title.trim() });
}

async function moveBoxToPage(
  transaction: DatabaseTransaction,
  boxId: string,
  pageId: string,
  frame?: BoxFrame,
) {
  if (pageId === COLLECTION_PAGE_ID) {
    throw new DomainCommandError('precondition_failed', 'Boxes cannot be moved into Collection.');
  }
  await requirePage(transaction, pageId);
  const box = await requireBox(transaction, boxId);
  const targetBoxes = await transaction
    .select({ zIndex: boxes.zIndex })
    .from(boxes)
    .where(eq(boxes.pageId, pageId))
    .orderBy(desc(boxes.zIndex))
    .limit(1)
    .all();
  const boxMutation = await updateBox(transaction, boxId, {
    pageId,
    ...(frame ? frameColumns(frame) : {}),
    zIndex: Math.max(box.zIndex, (targetBoxes[0]?.zIndex ?? 0) + 1),
  });
  const state = await requireAppState(transaction);
  if (state.activePageId === pageId) return boxMutation;
  const stateAfter = { ...state, activePageId: pageId };
  await transaction
    .update(appState)
    .set({ activePageId: pageId })
    .where(eq(appState.id, APP_STATE_ID));
  return {
    changes: [
      ...boxMutation.changes,
      rowChange('app_state', { id: APP_STATE_ID }, state, stateAfter),
    ],
  };
}

async function collectBox(transaction: DatabaseTransaction, boxId: string) {
  const box = await requireBox(transaction, boxId);
  if (box.pageId === RECYCLE_BIN_PAGE_ID) {
    throw new DomainCommandError('precondition_failed', 'Recycle Bin boxes cannot be collected.');
  }
  const existing = await transaction
    .select()
    .from(collectionBoxViews)
    .where(eq(collectionBoxViews.boxId, boxId))
    .get();
  if (existing) return noMutation();
  const views = await transaction
    .select()
    .from(collectionBoxViews)
    .orderBy(asc(collectionBoxViews.sortOrder))
    .all();
  const index = views.length;
  const view = {
    boxId,
    x: 64 + (index % 3) * 350,
    y: 92 + Math.floor(index / 3) * 290,
    width: Math.max(280, Math.min(520, box.width)),
    height: Math.max(220, Math.min(460, box.height)),
    viewMode: box.viewMode,
    detailMode: box.detailMode,
    sortOrder: index,
  };
  await transaction.insert(collectionBoxViews).values(view);
  const state = await requireAppState(transaction);
  const stateAfter = { ...state, activePageId: COLLECTION_PAGE_ID };
  await transaction
    .update(appState)
    .set({ activePageId: COLLECTION_PAGE_ID })
    .where(eq(appState.id, APP_STATE_ID));
  return {
    changes: [
      rowChange('collection_box_views', { boxId }, null, view),
      rowChange('app_state', { id: APP_STATE_ID }, state, stateAfter),
    ],
  };
}

async function removeBoxFromCollection(transaction: DatabaseTransaction, boxId: string) {
  const view = await transaction
    .select()
    .from(collectionBoxViews)
    .where(eq(collectionBoxViews.boxId, boxId))
    .get();
  if (!view) return noMutation();
  const followingIds = await getFollowingViewIds(transaction, view.sortOrder);
  const following = followingIds.length
    ? await transaction
        .select()
        .from(collectionBoxViews)
        .where(inArray(collectionBoxViews.boxId, followingIds))
        .all()
    : [];
  await transaction.delete(collectionBoxViews).where(eq(collectionBoxViews.boxId, boxId));
  const changes: DatabaseCommandMutation['changes'] = [
    rowChange('collection_box_views', { boxId }, view, null),
  ];
  for (const current of following) {
    const after = { ...current, sortOrder: current.sortOrder - 1 };
    await transaction
      .update(collectionBoxViews)
      .set({ sortOrder: after.sortOrder })
      .where(eq(collectionBoxViews.boxId, current.boxId));
    changes.push(rowChange('collection_box_views', { boxId: current.boxId }, current, after));
  }
  return { changes };
}

async function deleteBox(transaction: DatabaseTransaction, boxId: string) {
  const box = await requireBox(transaction, boxId);
  const view = await transaction
    .select()
    .from(collectionBoxViews)
    .where(eq(collectionBoxViews.boxId, boxId))
    .get();

  if (box.pageId !== RECYCLE_BIN_PAGE_ID) {
    const changes: DatabaseCommandMutation['changes'] = [];
    if (view) {
      await transaction.delete(collectionBoxViews).where(eq(collectionBoxViews.boxId, boxId));
      changes.push(rowChange('collection_box_views', { boxId }, view, null));
    }
    const after = { ...box, pageId: RECYCLE_BIN_PAGE_ID, updatedAt: new Date().toISOString() };
    await transaction
      .update(boxes)
      .set({ pageId: after.pageId, updatedAt: after.updatedAt })
      .where(eq(boxes.id, boxId));
    changes.push(rowChange('boxes', { id: boxId }, box, after));
    return { changes };
  }

  const placements = await transaction
    .select()
    .from(boxItems)
    .where(eq(boxItems.boxId, boxId))
    .all();
  const itemIds = placements.map((placement) => placement.itemId);
  const boxItemsData = itemIds.length
    ? await transaction.select().from(items).where(inArray(items.id, itemIds)).all()
    : [];
  const changes: DatabaseCommandMutation['changes'] = [];
  if (view) {
    await transaction.delete(collectionBoxViews).where(eq(collectionBoxViews.boxId, boxId));
    changes.push(rowChange('collection_box_views', { boxId }, view, null));
  }
  if (placements.length) {
    await transaction.delete(boxItems).where(eq(boxItems.boxId, boxId));
    for (const placement of placements) {
      changes.push(
        rowChange(
          'box_items',
          { boxId: placement.boxId, itemId: placement.itemId },
          placement,
          null,
        ),
      );
    }
  }
  if (itemIds.length) {
    await transaction.delete(items).where(inArray(items.id, itemIds));
    for (const item of boxItemsData) {
      changes.push(rowChange('items', { id: item.id }, item, null));
    }
  }
  await transaction.delete(boxes).where(eq(boxes.id, boxId));
  changes.push(rowChange('boxes', { id: boxId }, box, null));
  return { changes };
}

async function updateCollectionView(
  transaction: DatabaseTransaction,
  boxId: string,
  patch: Partial<typeof collectionBoxViews.$inferInsert>,
) {
  const before = await transaction
    .select()
    .from(collectionBoxViews)
    .where(eq(collectionBoxViews.boxId, boxId))
    .get();
  if (!before) return noMutation();
  const after = { ...before, ...patch, boxId };
  if (rowsEqual(before, after)) return noMutation();
  await transaction
    .update(collectionBoxViews)
    .set(after)
    .where(eq(collectionBoxViews.boxId, boxId));
  return {
    changes: [rowChange('collection_box_views', { boxId }, before, after)],
  };
}

async function arrangeCollection(
  transaction: DatabaseTransaction,
  frames: Record<string, BoxFrame>,
) {
  const ids = Object.keys(frames);
  if (!ids.length) return noMutation();
  const views = await transaction
    .select()
    .from(collectionBoxViews)
    .where(inArray(collectionBoxViews.boxId, ids))
    .all();
  const changes: DatabaseCommandMutation['changes'] = [];
  for (const before of views) {
    const frame = frames[before.boxId];
    if (!frame) continue;
    const after = { ...before, ...frameColumns(frame) };
    if (rowsEqual(before, after)) continue;
    await transaction
      .update(collectionBoxViews)
      .set(frameColumns(frame))
      .where(eq(collectionBoxViews.boxId, before.boxId));
    changes.push(rowChange('collection_box_views', { boxId: before.boxId }, before, after));
  }
  return { changes };
}

async function arrangePage(
  transaction: DatabaseTransaction,
  pageId: string,
  frames: Record<string, BoxFrame>,
  _layoutMode: 'freeform' | undefined,
) {
  const ids = Object.keys(frames);
  if (!ids.length) return noMutation();
  const pageBoxes = await transaction.select().from(boxes).where(eq(boxes.pageId, pageId)).all();
  const targets = pageBoxes.filter((box) => ids.includes(box.id));
  return updateBoxFrames(transaction, targets, frames);
}

async function constrainFrames(
  transaction: DatabaseTransaction,
  viewport: { width: number; height: number },
) {
  const allBoxes = await transaction.select().from(boxes).all();
  const horizontalMargin = viewport.width * 0.6;
  const verticalMargin = viewport.height * 0.6;
  const bounds = {
    minX: -horizontalMargin,
    minY: -verticalMargin,
    maxX: viewport.width + horizontalMargin,
    maxY: viewport.height + verticalMargin,
  };
  const frames = Object.fromEntries(
    allBoxes.map((box) => {
      const width = Math.min(box.width, bounds.maxX - bounds.minX);
      const height = Math.min(box.height, bounds.maxY - bounds.minY);
      return [
        box.id,
        {
          x: clamp(box.x, bounds.minX, bounds.maxX - width),
          y: clamp(box.y, bounds.minY, bounds.maxY - height),
          width,
          height,
        },
      ];
    }),
  );
  return updateBoxFrames(transaction, allBoxes, frames);
}

async function updateBoxFrames(
  transaction: DatabaseTransaction,
  currentBoxes: Array<typeof boxes.$inferSelect>,
  frames: Record<string, BoxFrame>,
) {
  const timestamp = new Date().toISOString();
  const changes: DatabaseCommandMutation['changes'] = [];
  for (const before of currentBoxes) {
    const frame = frames[before.id];
    if (!frame || frameEquals(before, frame)) continue;
    const after = { ...before, ...frameColumns(frame), updatedAt: timestamp };
    await transaction
      .update(boxes)
      .set({ ...frameColumns(frame), updatedAt: timestamp })
      .where(eq(boxes.id, before.id));
    changes.push(rowChange('boxes', { id: before.id }, before, after));
  }
  return { changes };
}

async function getFollowingViewIds(transaction: DatabaseTransaction, sortOrder: number) {
  const views = await transaction
    .select({ boxId: collectionBoxViews.boxId, sortOrder: collectionBoxViews.sortOrder })
    .from(collectionBoxViews)
    .orderBy(asc(collectionBoxViews.sortOrder))
    .all();
  return views.filter((view) => view.sortOrder > sortOrder).map((view) => view.boxId);
}

async function requireNormalPage(transaction: DatabaseTransaction, pageId: string) {
  if (pageId === COLLECTION_PAGE_ID || pageId === RECYCLE_BIN_PAGE_ID) {
    throw new DomainCommandError(
      'precondition_failed',
      'Boxes can only be created on normal pages.',
    );
  }
  return requirePage(transaction, pageId);
}

async function requirePage(transaction: DatabaseTransaction, pageId: string) {
  const page = await transaction.select().from(pages).where(eq(pages.id, pageId)).get();
  if (!page) {
    throw new DomainCommandError('not_found', `Page ${pageId} does not exist.`);
  }
  return page;
}

async function requireBox(transaction: DatabaseTransaction, boxId: string) {
  const box = await transaction.select().from(boxes).where(eq(boxes.id, boxId)).get();
  if (!box) {
    throw new DomainCommandError('not_found', `Box ${boxId} does not exist.`);
  }
  return box;
}

async function requireAppState(transaction: DatabaseTransaction) {
  const state = await transaction
    .select()
    .from(appState)
    .where(eq(appState.id, APP_STATE_ID))
    .get();
  if (!state) throw new Error('Cardo app state is not initialized.');
  return state;
}

function frameColumns(frame: BoxFrame) {
  return { x: frame.x, y: frame.y, width: frame.width, height: frame.height };
}

function frameEquals(box: typeof boxes.$inferSelect, frame: BoxFrame) {
  return (
    box.x === frame.x &&
    box.y === frame.y &&
    box.width === frame.width &&
    box.height === frame.height
  );
}

function rowsEqual(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  ignored: string[] = [],
) {
  return Object.keys(after).every((key) => ignored.includes(key) || before[key] === after[key]);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function noMutation(): DatabaseCommandMutation {
  return { changes: [] };
}
