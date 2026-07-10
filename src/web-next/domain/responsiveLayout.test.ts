import assert from 'node:assert/strict';
import test from 'node:test';
import { adaptWorkspaceToViewport } from './responsiveLayout';
import type { WorkspaceSnapshot } from './workspace';

const snapshot: WorkspaceSnapshot = {
  activePageId: 'page-a',
  defaultPageId: 'page-a',
  layoutViewport: { width: 1200, height: 800 },
  pages: [{ id: 'page-a', title: 'A', order: 0, createdAt: '', updatedAt: '' }],
  boxes: [
    {
      id: 'box-a',
      pageId: 'page-a',
      type: 'bookmark',
      title: 'Bookmarks',
      frame: { x: 300, y: 200, width: 360, height: 240 },
      items: [],
      createdAt: '',
      updatedAt: '',
    },
  ],
};

test('adapts box frames when the workspace viewport changes', () => {
  const nextSnapshot = adaptWorkspaceToViewport(snapshot, { width: 600, height: 400 });

  assert.deepEqual(nextSnapshot.layoutViewport, { width: 600, height: 400 });
  assert.deepEqual(nextSnapshot.boxes[0]?.frame, { x: 150, y: 100, width: 240, height: 170 });
});

test('records an initial viewport without changing legacy box frames', () => {
  const legacySnapshot = { ...snapshot, layoutViewport: undefined };
  const nextSnapshot = adaptWorkspaceToViewport(legacySnapshot, { width: 600, height: 400 });

  assert.deepEqual(nextSnapshot.boxes[0]?.frame, legacySnapshot.boxes[0]?.frame);
  assert.deepEqual(nextSnapshot.layoutViewport, { width: 600, height: 400 });
});
