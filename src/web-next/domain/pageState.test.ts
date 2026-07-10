import assert from 'node:assert/strict';
import test from 'node:test';
import { deletePage, reorderPages, setDefaultPage } from './reducers';
import type { WorkspaceSnapshot } from './workspace';

function createSnapshot(): WorkspaceSnapshot {
  return {
    activePageId: 'page-a',
    defaultPageId: 'page-a',
    pages: [
      { id: 'page-a', title: 'A', order: 0, createdAt: '', updatedAt: '' },
      { id: 'page-b', title: 'B', order: 1, createdAt: '', updatedAt: '' },
      { id: 'page-c', title: 'C', order: 2, createdAt: '', updatedAt: '' },
    ],
    boxes: [],
  };
}

test('setting the default page does not activate it immediately', () => {
  const snapshot = setDefaultPage(createSnapshot(), 'page-b');

  assert.equal(snapshot.defaultPageId, 'page-b');
  assert.equal(snapshot.activePageId, 'page-a');
});

test('page reordering preserves the selected default page', () => {
  const snapshot = setDefaultPage(createSnapshot(), 'page-b');
  const reordered = reorderPages(snapshot, ['page-c', 'page-b', 'page-a']);

  assert.deepEqual(
    reordered.pages.map((page) => page.id),
    ['page-c', 'page-b', 'page-a'],
  );
  assert.equal(reordered.defaultPageId, 'page-b');
});

test('deleting the default page chooses the first remaining page', () => {
  const snapshot = setDefaultPage(createSnapshot(), 'page-b');
  const nextSnapshot = deletePage(snapshot, 'page-b');

  assert.equal(nextSnapshot.defaultPageId, 'page-a');
  assert.equal(nextSnapshot.activePageId, 'page-a');
});
