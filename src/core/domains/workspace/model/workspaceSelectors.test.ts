import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createInitialWorkspaceSnapshot,
  createWorkspaceSnapshot,
} from './createInitialWorkspaceSnapshot';
import {
  getOrderedBoxes,
  getVisibleBoxes,
  getVisibleBoxIds,
  getWorkspaceBox,
} from './workspaceSelectors';

function createTestBox(id: string, isMinimized = false) {
  return {
    id,
    customTitle: null,
    templateId: 'collection' as const,
    templateState: {},
    bounds: { x: 0, y: 0, width: 320, height: 400 },
    isLocked: false,
    isCollapsed: false,
    isMinimized,
    layout: 'list' as const,
    zIndex: 1,
  };
}

test('getOrderedBoxes returns boxes in boxOrder sequence', () => {
  const snapshot = createWorkspaceSnapshot([
    createTestBox('box-c'),
    createTestBox('box-a'),
    createTestBox('box-b'),
  ]);

  const ordered = getOrderedBoxes(snapshot);
  assert.equal(ordered.length, 3);
  assert.equal(ordered[0].id, 'box-c');
  assert.equal(ordered[1].id, 'box-a');
  assert.equal(ordered[2].id, 'box-b');
});

test('getOrderedBoxes filters out missing boxes', () => {
  const snapshot = createWorkspaceSnapshot([createTestBox('box-a')]);
  snapshot.boxOrder = ['box-a', 'box-missing', 'box-b'];

  const ordered = getOrderedBoxes(snapshot);
  assert.equal(ordered.length, 1);
  assert.equal(ordered[0].id, 'box-a');
});

test('getVisibleBoxes keeps legacy minimized boxes visible after dock removal', () => {
  const snapshot = createWorkspaceSnapshot([
    createTestBox('box-1', false),
    createTestBox('box-2', true),
    createTestBox('box-3', false),
  ]);

  const visible = getVisibleBoxes(snapshot);
  assert.equal(visible.length, 3);
  assert.equal(visible[0].id, 'box-1');
  assert.equal(visible[1].id, 'box-2');
  assert.equal(visible[2].id, 'box-3');
});

test('getVisibleBoxes keeps collapsed boxes on desktop', () => {
  const snapshot = createWorkspaceSnapshot([
    { ...createTestBox('box-1', false), isCollapsed: true },
    createTestBox('box-2', false),
  ]);

  const visible = getVisibleBoxes(snapshot);
  assert.equal(visible.length, 2);
  assert.equal(visible[0].isCollapsed, true);
});

test('getVisibleBoxIds returns array of visible box ids', () => {
  const snapshot = createWorkspaceSnapshot([
    createTestBox('box-1', false),
    createTestBox('box-2', true),
    createTestBox('box-3', false),
  ]);

  const ids = getVisibleBoxIds(snapshot);
  assert.deepEqual(ids, ['box-1', 'box-2', 'box-3']);
});

test('getWorkspaceBox returns box by id', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const box = getWorkspaceBox(snapshot, 'default-collection-folders');

  assert.notEqual(box, null);
  assert.equal(box?.id, 'default-collection-folders');
});

test('getWorkspaceBox returns null for non-existent box', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const box = getWorkspaceBox(snapshot, 'non-existent');

  assert.equal(box, null);
});
