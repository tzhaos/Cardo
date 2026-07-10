import assert from 'node:assert/strict';
import test from 'node:test';
import { createCanvasWorldBounds } from './canvasGeometry';
import { findPageLandingFrame } from './placement';
import type { WorkspaceSnapshot } from './workspace';

function createSnapshot(): WorkspaceSnapshot {
  return {
    activePageId: 'source',
    defaultPageId: 'source',
    pages: [
      { id: 'source', title: 'Source', order: 0, createdAt: '', updatedAt: '' },
      { id: 'target', title: 'Target', order: 1, createdAt: '', updatedAt: '' },
    ],
    boxes: [
      {
        id: 'moving',
        pageId: 'source',
        type: 'folder',
        title: 'Moving',
        frame: { x: 20, y: 20, width: 280, height: 200 },
        items: [],
        createdAt: '',
        updatedAt: '',
      },
    ],
  };
}

test('findPageLandingFrame centers a box on an empty page', () => {
  const frame = findPageLandingFrame(
    createSnapshot(),
    'moving',
    'target',
    { x: 600, y: 400 },
    createCanvasWorldBounds({ width: 1200, height: 800 }),
  );

  assert.deepEqual(frame, { x: 460, y: 300, width: 280, height: 200 });
});

test('findPageLandingFrame chooses a nearby free position when center is occupied', () => {
  const snapshot = createSnapshot();
  snapshot.boxes.push({
    id: 'occupied',
    pageId: 'target',
    type: 'bookmark',
    title: 'Occupied',
    frame: { x: 440, y: 280, width: 320, height: 240 },
    items: [],
    createdAt: '',
    updatedAt: '',
  });

  const frame = findPageLandingFrame(
    snapshot,
    'moving',
    'target',
    { x: 600, y: 400 },
    createCanvasWorldBounds({ width: 1200, height: 800 }),
  );

  assert.ok(frame);
  assert.notDeepEqual(frame, { x: 460, y: 300, width: 280, height: 200 });
});
