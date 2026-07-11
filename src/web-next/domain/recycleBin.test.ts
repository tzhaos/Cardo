import assert from 'node:assert/strict';
import test from 'node:test';
import { deleteBox, deletePage, moveBoxToPage, reorderPages } from './reducers';
import { COLLECTION_PAGE_ID, RECYCLE_BIN_PAGE_ID, type WorkspaceSnapshot } from './workspace';

function createSnapshot(): WorkspaceSnapshot {
  return {
    activePageId: 'page-a',
    defaultPageId: 'page-a',
    collectionBoxIds: [],
    collectionViews: {},
    pages: [
      { id: COLLECTION_PAGE_ID, title: 'Collection', order: -1, createdAt: '', updatedAt: '' },
      { id: 'page-a', title: 'A', order: 0, createdAt: '', updatedAt: '' },
      { id: 'page-b', title: 'B', order: 1, createdAt: '', updatedAt: '' },
      {
        id: RECYCLE_BIN_PAGE_ID,
        title: 'Recycle Bin',
        order: 2,
        createdAt: '',
        updatedAt: '',
      },
    ],
    boxes: [
      {
        id: 'box-a',
        pageId: 'page-a',
        preset: 'folder',
        kind: 'normal',
        title: 'A box',
        frame: { x: 0, y: 0, width: 320, height: 240 },
        items: [],
        viewMode: 'list',
        detailMode: 'detailed',
        isLocked: false,
        createdAt: '',
        updatedAt: '',
      },
    ],
  };
}

test('deleting a box moves it to the recycle bin and deleting it again removes it', () => {
  const trashed = deleteBox(createSnapshot(), 'box-a');
  assert.equal(trashed.boxes[0]?.pageId, RECYCLE_BIN_PAGE_ID);

  const deleted = deleteBox(trashed, 'box-a');
  assert.deepEqual(deleted.boxes, []);
});

test('moving a recycled box to a workspace page restores it', () => {
  const trashed = deleteBox(createSnapshot(), 'box-a');
  const restored = moveBoxToPage(trashed, 'box-a', 'page-b');

  assert.equal(restored.activePageId, 'page-b');
  assert.equal(restored.boxes[0]?.pageId, 'page-b');
});

test('the recycle bin remains fixed when workspace pages are reordered', () => {
  const reordered = reorderPages(createSnapshot(), ['page-b', 'page-a']);

  assert.deepEqual(
    reordered.pages.map((page) => page.id),
    [COLLECTION_PAGE_ID, 'page-b', 'page-a', RECYCLE_BIN_PAGE_ID],
  );
});

test('deleting a workspace page moves its boxes to the recycle bin', () => {
  const nextSnapshot = deletePage(createSnapshot(), 'page-a');

  assert.equal(nextSnapshot.boxes[0]?.pageId, RECYCLE_BIN_PAGE_ID);
  assert.equal(nextSnapshot.activePageId, COLLECTION_PAGE_ID);
  assert.equal(nextSnapshot.defaultPageId, 'page-b');
});
