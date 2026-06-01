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
  findBoxByRole,
  areAllBoxesMinimized,
} from './workspaceSelectors';

function createTestBox(
  id: string,
  role: 'folders' | 'links' | 'notes' | null,
  isMinimized = false,
) {
  return {
    id,
    role,
    customTitle: null,
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
    createTestBox('box-c', null),
    createTestBox('box-a', null),
    createTestBox('box-b', null),
  ]);

  const ordered = getOrderedBoxes(snapshot);
  assert.equal(ordered.length, 3);
  assert.equal(ordered[0].id, 'box-c');
  assert.equal(ordered[1].id, 'box-a');
  assert.equal(ordered[2].id, 'box-b');
});

test('getOrderedBoxes filters out missing boxes', () => {
  const snapshot = createWorkspaceSnapshot([createTestBox('box-a', null)]);
  snapshot.boxOrder = ['box-a', 'box-missing', 'box-b'];

  const ordered = getOrderedBoxes(snapshot);
  assert.equal(ordered.length, 1);
  assert.equal(ordered[0].id, 'box-a');
});

test('getVisibleBoxes returns only non-minimized boxes', () => {
  const snapshot = createWorkspaceSnapshot([
    createTestBox('box-1', null, false),
    createTestBox('box-2', null, true),
    createTestBox('box-3', null, false),
  ]);

  const visible = getVisibleBoxes(snapshot);
  assert.equal(visible.length, 2);
  assert.equal(visible[0].id, 'box-1');
  assert.equal(visible[1].id, 'box-3');
});

test('getVisibleBoxes keeps collapsed boxes on desktop', () => {
  const snapshot = createWorkspaceSnapshot([
    { ...createTestBox('box-1', null, false), isCollapsed: true },
    createTestBox('box-2', null, false),
  ]);

  const visible = getVisibleBoxes(snapshot);
  assert.equal(visible.length, 2);
  assert.equal(visible[0].isCollapsed, true);
});

test('getVisibleBoxIds returns array of visible box ids', () => {
  const snapshot = createWorkspaceSnapshot([
    createTestBox('box-1', null, false),
    createTestBox('box-2', null, true),
    createTestBox('box-3', null, false),
  ]);

  const ids = getVisibleBoxIds(snapshot);
  assert.deepEqual(ids, ['box-1', 'box-3']);
});

test('getWorkspaceBox returns box by id', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const box = getWorkspaceBox(snapshot, 'system-folders');

  assert.notEqual(box, null);
  assert.equal(box?.id, 'system-folders');
  assert.equal(box?.role, 'folders');
});

test('getWorkspaceBox returns null for non-existent box', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const box = getWorkspaceBox(snapshot, 'non-existent');

  assert.equal(box, null);
});

test('findBoxByRole finds box by system role', () => {
  const snapshot = createInitialWorkspaceSnapshot();

  const foldersBox = findBoxByRole(snapshot, 'folders');
  assert.equal(foldersBox?.role, 'folders');

  const linksBox = findBoxByRole(snapshot, 'links');
  assert.equal(linksBox?.role, 'links');

  const notesBox = findBoxByRole(snapshot, 'notes');
  assert.equal(notesBox?.role, 'notes');
});

test('findBoxByRole returns null when role not found', () => {
  const snapshot = createWorkspaceSnapshot([createTestBox('box-1', null)]);
  const result = findBoxByRole(snapshot, 'folders');

  assert.equal(result, null);
});

test('areAllBoxesMinimized returns true when all boxes minimized', () => {
  const snapshot = createWorkspaceSnapshot([
    createTestBox('box-1', null, true),
    createTestBox('box-2', null, true),
  ]);

  assert.equal(areAllBoxesMinimized(snapshot), true);
});

test('areAllBoxesMinimized returns false when any box visible', () => {
  const snapshot = createWorkspaceSnapshot([
    createTestBox('box-1', null, true),
    createTestBox('box-2', null, false),
  ]);

  assert.equal(areAllBoxesMinimized(snapshot), false);
});

test('areAllBoxesMinimized returns true for empty workspace', () => {
  const snapshot = createWorkspaceSnapshot([]);
  assert.equal(areAllBoxesMinimized(snapshot), true);
});
