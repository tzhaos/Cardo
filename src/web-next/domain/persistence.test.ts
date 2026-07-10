import assert from 'node:assert/strict';
import test from 'node:test';
import { extractPersistedWorkspaceSnapshot, restoreWorkspaceSnapshot } from './persistence';
import { COLLECTION_PAGE_ID, RECYCLE_BIN_PAGE_ID, type WorkspaceSnapshot } from './workspace';

const fallback: WorkspaceSnapshot = {
  activePageId: 'fallback',
  defaultPageId: 'fallback',
  pages: [{ id: 'fallback', title: 'Fallback', order: 0, createdAt: '', updatedAt: '' }],
  boxes: [],
};

test('restored workspaces open the declared default page', () => {
  const restored = restoreWorkspaceSnapshot(
    {
      activePageId: 'page-a',
      defaultPageId: 'page-a',
      pages: [
        { id: 'page-b', title: 'B', order: 1, createdAt: '', updatedAt: '' },
        { id: 'page-a', title: 'A', order: 0, createdAt: '', updatedAt: '' },
      ],
      boxes: [],
    },
    fallback,
  );

  assert.equal(restored.activePageId, 'page-a');
  assert.equal(restored.defaultPageId, 'page-a');
  assert.deepEqual(
    restored.pages.map((page) => page.id),
    [COLLECTION_PAGE_ID, 'page-a', 'page-b', RECYCLE_BIN_PAGE_ID],
  );
});

test('persisted active pages do not override the default start page', () => {
  const restored = restoreWorkspaceSnapshot(
    {
      activePageId: 'page-b',
      defaultPageId: 'page-a',
      pages: [
        { id: 'page-a', title: 'A', order: 0, createdAt: '', updatedAt: '' },
        { id: 'page-b', title: 'B', order: 1, createdAt: '', updatedAt: '' },
      ],
      boxes: [],
    },
    fallback,
  );

  assert.equal(restored.activePageId, 'page-a');
});

test('invalid persisted workspaces fall back safely', () => {
  assert.equal(restoreWorkspaceSnapshot({ pages: [], boxes: [] }, fallback), fallback);
});

test('extracts a workspace from the persisted Zustand envelope', () => {
  const snapshot = extractPersistedWorkspaceSnapshot({
    state: {
      snapshot: {
        activePageId: 'page-a',
        defaultPageId: 'page-a',
        pages: [{ id: 'page-a', title: 'A', order: 0, createdAt: '', updatedAt: '' }],
        boxes: [],
      },
    },
  });

  assert.equal(snapshot?.activePageId, 'page-a');
  assert.equal(snapshot?.pages.length, 3);
  assert.equal(snapshot?.pages.at(-1)?.id, RECYCLE_BIN_PAGE_ID);
});
