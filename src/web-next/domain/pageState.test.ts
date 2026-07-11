import assert from 'node:assert/strict';
import test from 'node:test';
import { deletePage, reorderPages } from './reducers';
import { COLLECTION_PAGE_ID, type WorkspaceSnapshot } from './workspace';

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
      { id: 'page-c', title: 'C', order: 2, createdAt: '', updatedAt: '' },
    ],
    boxes: [],
  };
}

test('page reordering preserves the collection page position', () => {
  const reordered = reorderPages(createSnapshot(), ['page-c', 'page-b', 'page-a']);

  assert.deepEqual(
    reordered.pages.map((page) => page.id),
    [COLLECTION_PAGE_ID, 'page-c', 'page-b', 'page-a'],
  );
});

test('deleting the active page opens the collection page', () => {
  const nextSnapshot = deletePage(createSnapshot(), 'page-a');

  assert.equal(nextSnapshot.activePageId, COLLECTION_PAGE_ID);
  assert.equal(nextSnapshot.defaultPageId, 'page-b');
});
