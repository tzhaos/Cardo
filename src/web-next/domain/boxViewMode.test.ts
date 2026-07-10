import assert from 'node:assert/strict';
import test from 'node:test';
import { setBoxDetailMode, setBoxViewMode } from './reducers';
import type { WorkspaceSnapshot } from './workspace';

const snapshot: WorkspaceSnapshot = {
  activePageId: 'page-a',
  pages: [{ id: 'page-a', title: 'A', order: 0, createdAt: '', updatedAt: '' }],
  boxes: [
    {
      id: 'box-a',
      pageId: 'page-a',
      preset: 'bookmark',
      title: 'Bookmarks',
      frame: { x: 0, y: 0, width: 320, height: 240 },
      items: [],
      viewMode: 'list',
      createdAt: '',
      updatedAt: '',
    },
  ],
};

test('sets a box view mode without changing its content', () => {
  const nextSnapshot = setBoxViewMode(snapshot, 'box-a', 'grid');

  assert.equal(nextSnapshot.boxes[0]?.viewMode, 'grid');
  assert.deepEqual(nextSnapshot.boxes[0]?.items, []);
});

test('sets a compact detail mode without changing box content or layout', () => {
  const nextSnapshot = setBoxDetailMode(snapshot, 'box-a', 'compact');

  assert.equal(nextSnapshot.boxes[0]?.detailMode, 'compact');
  assert.equal(nextSnapshot.boxes[0]?.viewMode, 'list');
  assert.deepEqual(nextSnapshot.boxes[0]?.items, []);
});
