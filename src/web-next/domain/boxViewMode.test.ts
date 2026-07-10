import assert from 'node:assert/strict';
import test from 'node:test';
import { setBoxViewMode } from './reducers';
import type { WorkspaceSnapshot } from './workspace';

const snapshot: WorkspaceSnapshot = {
  activePageId: 'page-a',
  defaultPageId: 'page-a',
  pages: [{ id: 'page-a', title: 'A', order: 0, createdAt: '', updatedAt: '' }],
  boxes: [
    {
      id: 'box-a',
      pageId: 'page-a',
      type: 'bookmark',
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
