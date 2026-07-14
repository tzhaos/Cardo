import assert from 'node:assert/strict';
import test from 'node:test';
import { createCanvasWorldBounds } from './canvasGeometry';
import { findPageLandingFrame } from './placement';
import type { WorkspaceProjection } from './workspace';

function createProjection(): WorkspaceProjection {
  return {
    activePageId: 'source',
    defaultPageId: 'source',
    collectionBoxIds: [],
    collectionViews: {},
    pages: [
      {
        id: 'source',
        title: 'Source',
        order: 0,
        groupViewMode: 'freeform',
        waterfallColumns: 0,
        listColumns: 1,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'target',
        title: 'Target',
        order: 1,
        groupViewMode: 'freeform',
        waterfallColumns: 0,
        listColumns: 1,
        createdAt: '',
        updatedAt: '',
      },
    ],
    boxes: [
      {
        id: 'moving',
        pageId: 'source',
        kind: 'normal',
        title: 'Moving',
        frame: { x: 20, y: 20, width: 280, height: 200 },
        modeLayouts: {
          waterfall: { x: 20, y: 20, width: 280, height: 200 },
          list: { x: 20, y: 20, width: 280, height: 200 },
        },
        items: [],
        viewMode: 'list',
        detailMode: 'detailed',
        isLocked: false,
        icon: 'box',
        accent: '#3b82f6',
        createdAt: '',
        updatedAt: '',
      },
    ],
  };
}

test('findPageLandingFrame centers a box on an empty page', () => {
  const frame = findPageLandingFrame(
    createProjection(),
    'moving',
    'target',
    { x: 600, y: 400 },
    createCanvasWorldBounds({ width: 1200, height: 800 }),
  );

  assert.deepEqual(frame, { x: 460, y: 300, width: 280, height: 200 });
});

test('findPageLandingFrame without avoidOverlap allows center even if occupied', () => {
  const projection = createProjection();
  projection.boxes.push({
    id: 'occupied',
    pageId: 'target',
    kind: 'normal',
    title: 'Occupied',
    frame: { x: 440, y: 280, width: 320, height: 240 },
    modeLayouts: {
      waterfall: { x: 440, y: 280, width: 320, height: 240 },
      list: { x: 440, y: 280, width: 320, height: 240 },
    },
    items: [],
    viewMode: 'list',
    detailMode: 'detailed',
    isLocked: false,
    icon: 'box',
    accent: '#f97316',
    createdAt: '',
    updatedAt: '',
  });

  const frame = findPageLandingFrame(
    projection,
    'moving',
    'target',
    { x: 600, y: 400 },
    createCanvasWorldBounds({ width: 1200, height: 800 }),
  );

  assert.deepEqual(frame, { x: 460, y: 300, width: 280, height: 200 });
});

test('findPageLandingFrame with avoidOverlap seeks a free slot when center is occupied', () => {
  const projection = createProjection();
  projection.boxes.push({
    id: 'occupied',
    pageId: 'target',
    kind: 'normal',
    title: 'Occupied',
    frame: { x: 440, y: 280, width: 320, height: 240 },
    modeLayouts: {
      waterfall: { x: 440, y: 280, width: 320, height: 240 },
      list: { x: 440, y: 280, width: 320, height: 240 },
    },
    items: [],
    viewMode: 'list',
    detailMode: 'detailed',
    isLocked: false,
    icon: 'box',
    accent: '#f97316',
    createdAt: '',
    updatedAt: '',
  });

  const frame = findPageLandingFrame(
    projection,
    'moving',
    'target',
    { x: 600, y: 400 },
    createCanvasWorldBounds({ width: 1200, height: 800 }),
    { avoidOverlap: true },
  );

  assert.ok(frame);
  assert.notDeepEqual(frame, { x: 460, y: 300, width: 280, height: 200 });
});
