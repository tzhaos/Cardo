import { asc, eq, inArray, notInArray, sql } from 'drizzle-orm';
import type { WorkspaceCommand } from '../contracts/workspaceCommands';
import { COLLECTION_PAGE_ID, RECYCLE_BIN_PAGE_ID } from '../contracts/systemPages';
import { APP_STATE_ID, appState, boxes, collectionBoxViews, pages } from '../database/schema';
import type { DatabaseCommandMutation, DatabaseTransaction } from './commandTypes';
import { rowChange } from './historyChanges';

export type PageCommand = Extract<WorkspaceCommand, { type: `page.${string}` }>;

export async function executePageCommand(
  transaction: DatabaseTransaction,
  command: PageCommand,
): Promise<DatabaseCommandMutation> {
  switch (command.type) {
    case 'page.create':
      return createPage(transaction, command.title);
    case 'page.rename':
      return renamePage(transaction, command.pageId, command.title);
    case 'page.delete':
      return deletePage(transaction, command.pageId);
    case 'page.reorder':
      return reorderPages(transaction, command.orderedPageIds);
    case 'page.setDefault':
      return setDefaultPage(transaction, command.pageId);
    case 'page.open':
      return openPage(transaction, command.pageId);
  }
}

async function createPage(transaction: DatabaseTransaction, title: string) {
  const nextTitle = title.trim() || 'Untitled';
  const timestamp = new Date().toISOString();
  const pageId = `page-${crypto.randomUUID()}`;
  const normalPages = await selectNormalPages(transaction);
  const recyclePage = await selectPage(transaction, RECYCLE_BIN_PAGE_ID);
  const stateBefore = await requireAppState(transaction);
  const page = {
    id: pageId,
    title: nextTitle,
    sortOrder: normalPages.length,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  if (recyclePage) {
    await transaction
      .update(pages)
      .set({ sortOrder: normalPages.length + 1, updatedAt: timestamp })
      .where(eq(pages.id, RECYCLE_BIN_PAGE_ID));
  }
  await transaction.insert(pages).values(page);
  const stateAfter = { ...stateBefore, activePageId: pageId };
  await transaction
    .update(appState)
    .set({ activePageId: pageId })
    .where(eq(appState.id, APP_STATE_ID));

  return {
    result: { createdPageId: pageId },
    changes: [
      rowChange('pages', { id: pageId }, null, page),
      rowChange('app_state', { id: APP_STATE_ID }, stateBefore, stateAfter),
      ...(recyclePage
        ? [
            rowChange('pages', { id: recyclePage.id }, recyclePage, {
              ...recyclePage,
              sortOrder: normalPages.length + 1,
              updatedAt: timestamp,
            }),
          ]
        : []),
    ],
  } satisfies DatabaseCommandMutation;
}

async function renamePage(transaction: DatabaseTransaction, pageId: string, title: string) {
  assertNormalPageId(pageId);
  const page = await requirePage(transaction, pageId);
  const nextTitle = title.trim();
  if (!nextTitle || nextTitle === page.title) return noMutation();
  const after = { ...page, title: nextTitle, updatedAt: new Date().toISOString() };
  await transaction
    .update(pages)
    .set({ title: after.title, updatedAt: after.updatedAt })
    .where(eq(pages.id, pageId));
  return { changes: [rowChange('pages', { id: pageId }, page, after)] };
}

async function setDefaultPage(
  transaction: DatabaseTransaction,
  pageId: string,
): Promise<DatabaseCommandMutation> {
  assertNormalPageId(pageId);
  await requirePage(transaction, pageId);
  const before = await requireAppState(transaction);
  if (before.defaultPageId === pageId) return noMutation();
  const after = { ...before, defaultPageId: pageId };
  await transaction
    .update(appState)
    .set({ defaultPageId: pageId })
    .where(eq(appState.id, APP_STATE_ID));
  return { changes: [rowChange('app_state', { id: APP_STATE_ID }, before, after)] };
}

async function openPage(
  transaction: DatabaseTransaction,
  pageId: string,
): Promise<DatabaseCommandMutation> {
  await requirePage(transaction, pageId);
  const before = await requireAppState(transaction);
  if (before.activePageId === pageId) return noMutation();
  const after = { ...before, activePageId: pageId };
  await transaction
    .update(appState)
    .set({ activePageId: pageId })
    .where(eq(appState.id, APP_STATE_ID));
  return { changes: [rowChange('app_state', { id: APP_STATE_ID }, before, after)] };
}

async function reorderPages(transaction: DatabaseTransaction, orderedPageIds: string[]) {
  const normalPages = await selectNormalPages(transaction);
  const currentIds = normalPages.map((page) => page.id);
  if (
    orderedPageIds.length !== currentIds.length ||
    new Set(orderedPageIds).size !== orderedPageIds.length ||
    orderedPageIds.some((pageId) => !currentIds.includes(pageId))
  ) {
    throw new Error('Page reorder must contain every normal page exactly once.');
  }
  if (currentIds.every((pageId, index) => pageId === orderedPageIds[index])) {
    return noMutation();
  }

  const timestamp = new Date().toISOString();
  const pageById = new Map(normalPages.map((page) => [page.id, page]));
  const recyclePage = await selectPage(transaction, RECYCLE_BIN_PAGE_ID);
  const changes: DatabaseCommandMutation['changes'] = [];

  await transaction
    .update(pages)
    .set({ sortOrder: sql`${pages.sortOrder} + 10000` })
    .where(inArray(pages.id, orderedPageIds));

  for (const [sortOrder, pageId] of orderedPageIds.entries()) {
    const before = pageById.get(pageId)!;
    const after = { ...before, sortOrder, updatedAt: timestamp };
    await transaction
      .update(pages)
      .set({ sortOrder, updatedAt: timestamp })
      .where(eq(pages.id, pageId));
    changes.push(rowChange('pages', { id: pageId }, before, after));
  }

  if (recyclePage && recyclePage.sortOrder !== normalPages.length) {
    const after = { ...recyclePage, sortOrder: normalPages.length, updatedAt: timestamp };
    await transaction
      .update(pages)
      .set({ sortOrder: after.sortOrder, updatedAt: timestamp })
      .where(eq(pages.id, recyclePage.id));
    changes.push(rowChange('pages', { id: recyclePage.id }, recyclePage, after));
  }

  return { changes };
}

async function deletePage(transaction: DatabaseTransaction, pageId: string) {
  assertNormalPageId(pageId);
  const normalPages = await selectNormalPages(transaction);
  if (normalPages.length <= 1) throw new Error('The final normal page cannot be deleted.');
  const page = normalPages.find((candidate) => candidate.id === pageId);
  if (!page) throw new Error(`Page ${pageId} does not exist.`);
  const remainingPages = normalPages.filter((candidate) => candidate.id !== pageId);
  const recyclePage = await requirePage(transaction, RECYCLE_BIN_PAGE_ID);
  const stateBefore = await requireAppState(transaction);
  const movedBoxes = await transaction.select().from(boxes).where(eq(boxes.pageId, pageId)).all();
  const movedBoxIds = movedBoxes.map((box) => box.id);
  const collectedViews = movedBoxIds.length
    ? await transaction
        .select()
        .from(collectionBoxViews)
        .where(inArray(collectionBoxViews.boxId, movedBoxIds))
        .all()
    : [];
  const timestamp = new Date().toISOString();
  const changes: DatabaseCommandMutation['changes'] = [];

  if (collectedViews.length) {
    await transaction
      .delete(collectionBoxViews)
      .where(inArray(collectionBoxViews.boxId, movedBoxIds));
    for (const view of collectedViews) {
      changes.push(rowChange('collection_box_views', { boxId: view.boxId }, view, null));
    }
  }

  if (movedBoxIds.length) {
    await transaction
      .update(boxes)
      .set({ pageId: RECYCLE_BIN_PAGE_ID, updatedAt: timestamp })
      .where(inArray(boxes.id, movedBoxIds));
    for (const box of movedBoxes) {
      changes.push(
        rowChange('boxes', { id: box.id }, box, {
          ...box,
          pageId: RECYCLE_BIN_PAGE_ID,
          updatedAt: timestamp,
        }),
      );
    }
  }

  await transaction.delete(pages).where(eq(pages.id, pageId));
  changes.push(rowChange('pages', { id: pageId }, page, null));

  await transaction
    .update(pages)
    .set({ sortOrder: sql`${pages.sortOrder} + 10000` })
    .where(notInArray(pages.id, [COLLECTION_PAGE_ID, RECYCLE_BIN_PAGE_ID, pageId]));

  for (const [sortOrder, currentPage] of remainingPages.entries()) {
    const after = { ...currentPage, sortOrder, updatedAt: timestamp };
    await transaction
      .update(pages)
      .set({ sortOrder, updatedAt: timestamp })
      .where(eq(pages.id, currentPage.id));
    if (currentPage.sortOrder !== sortOrder) {
      changes.push(rowChange('pages', { id: currentPage.id }, currentPage, after));
    }
  }

  const recycleAfter = {
    ...recyclePage,
    sortOrder: remainingPages.length,
    updatedAt: timestamp,
  };
  await transaction
    .update(pages)
    .set({ sortOrder: recycleAfter.sortOrder, updatedAt: timestamp })
    .where(eq(pages.id, RECYCLE_BIN_PAGE_ID));
  changes.push(rowChange('pages', { id: RECYCLE_BIN_PAGE_ID }, recyclePage, recycleAfter));

  const stateAfter = {
    ...stateBefore,
    activePageId:
      stateBefore.activePageId === pageId ? COLLECTION_PAGE_ID : stateBefore.activePageId,
    defaultPageId:
      stateBefore.defaultPageId === pageId ? remainingPages[0].id : stateBefore.defaultPageId,
  };
  await transaction
    .update(appState)
    .set({
      activePageId: stateAfter.activePageId,
      defaultPageId: stateAfter.defaultPageId,
    })
    .where(eq(appState.id, APP_STATE_ID));
  changes.push(rowChange('app_state', { id: APP_STATE_ID }, stateBefore, stateAfter));

  return { changes };
}

function assertNormalPageId(pageId: string) {
  if (pageId === COLLECTION_PAGE_ID || pageId === RECYCLE_BIN_PAGE_ID) {
    throw new Error('System pages cannot be mutated by normal Page commands.');
  }
}

async function selectNormalPages(transaction: DatabaseTransaction) {
  return await transaction
    .select()
    .from(pages)
    .where(notInArray(pages.id, [COLLECTION_PAGE_ID, RECYCLE_BIN_PAGE_ID]))
    .orderBy(asc(pages.sortOrder))
    .all();
}

async function selectPage(transaction: DatabaseTransaction, pageId: string) {
  return await transaction.select().from(pages).where(eq(pages.id, pageId)).get();
}

async function requirePage(transaction: DatabaseTransaction, pageId: string) {
  const page = await selectPage(transaction, pageId);
  if (!page) throw new Error(`Page ${pageId} does not exist.`);
  return page;
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

function noMutation(): DatabaseCommandMutation {
  return { changes: [] };
}
