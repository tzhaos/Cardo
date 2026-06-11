import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkspaceItem } from '../../items/model/item';
import { createInitialWorkspaceSnapshot } from './createInitialWorkspaceSnapshot';
import { reduceWorkspace } from './reduceWorkspace';
import { getBoxItems } from './workspaceSelectors';
import {
  WORKSPACE_EXPORT_VERSION,
  WORKSPACE_SCHEMA_VERSION,
  type WorkspaceBoxWithItems,
} from './workspace';
import {
  createWorkspaceExportDocument,
  parseWorkspaceExportDocument,
  parseWorkspaceSnapshot,
} from './workspaceCodec';

test('workspace reducer keeps items global and pin state in placements', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const noteItem = createWorkspaceItem('item-note', {
    type: 'note',
    title: 'Scratch',
    content: 'Initial note',
  });

  const withItem = reduceWorkspace(snapshot, {
    type: 'item.add',
    boxId: 'default-box',
    item: noteItem,
  });
  assert.equal(Object.keys(withItem.itemsById).length, 1);
  assert.equal(getBoxItems(withItem, 'default-box')[0].title, 'Scratch');
  assert.equal(getBoxItems(withItem, 'default-box')[0].isPinned, false);

  const withUpdatedItem = reduceWorkspace(withItem, {
    type: 'item.update',
    boxId: 'default-box',
    itemId: noteItem.id,
    updates: {
      title: 'Updated scratch',
      text: 'Updated note',
    },
  });
  assert.equal(withUpdatedItem.itemsById[noteItem.id].title, 'Updated scratch');
  const updatedPlacedItem = getBoxItems(withUpdatedItem, 'default-box')[0];
  assert.equal(updatedPlacedItem.type, 'note');
  assert.equal(updatedPlacedItem.type === 'note' ? updatedPlacedItem.text : null, 'Updated note');

  const withPinnedItem = reduceWorkspace(withUpdatedItem, {
    type: 'item.setPinned',
    boxId: 'default-box',
    itemId: noteItem.id,
    isPinned: true,
  });
  assert.equal(withPinnedItem.itemPlacementsByBoxId['default-box'][0].isPinned, true);

  const withoutItem = reduceWorkspace(withPinnedItem, {
    type: 'item.delete',
    boxId: 'default-box',
    itemId: noteItem.id,
  });
  assert.equal(withoutItem.itemPlacementsByBoxId['default-box'].length, 0);
  assert.equal(withoutItem.itemsById[noteItem.id], undefined);
});

test('move item inherits placement pin state without mutating item entity', () => {
  const sourceItem = createWorkspaceItem('item-source', {
    type: 'folder',
    title: 'Source',
    content: 'C:\\Source',
  });
  const pinnedTarget = createWorkspaceItem('item-target', {
    type: 'url',
    title: 'Pinned target',
    content: 'https://example.com',
  });
  const foldersBox = {
    id: 'system-folders',
    customTitle: 'Folders',
    bounds: { x: 100, y: 100, width: 320, height: 400 },
    isLocked: false,
    isCollapsed: false,
    isMinimized: false,
    layout: 'grid',
    zIndex: 10,
    items: [{ ...sourceItem, boxId: 'system-folders', isPinned: false }],
  } satisfies WorkspaceBoxWithItems;
  const linksBox = {
    id: 'system-links',
    customTitle: 'Links',
    bounds: { x: 450, y: 100, width: 320, height: 400 },
    isLocked: false,
    isCollapsed: false,
    isMinimized: false,
    layout: 'list',
    zIndex: 11,
    items: [{ ...pinnedTarget, boxId: 'system-links', isPinned: true }],
  } satisfies WorkspaceBoxWithItems;
  const notesBox = {
    id: 'system-notes',
    customTitle: 'Notes',
    bounds: { x: 800, y: 100, width: 320, height: 400 },
    isLocked: false,
    isCollapsed: false,
    isMinimized: false,
    layout: 'list',
    zIndex: 12,
    items: [],
  } satisfies WorkspaceBoxWithItems;

  const snapshot = reduceWorkspace(createInitialWorkspaceSnapshot(), {
    type: 'workspace.replaceBoxes',
    boxes: [foldersBox, linksBox, notesBox],
  });
  const nextState = reduceWorkspace(snapshot, {
    type: 'item.move',
    itemId: sourceItem.id,
    sourceBoxId: 'system-folders',
    targetBoxId: 'system-links',
    targetIndex: 0,
  });

  assert.equal(getBoxItems(snapshot, 'system-folders')[0].isPinned, false);
  assert.equal(getBoxItems(nextState, 'system-folders').length, 0);
  assert.equal(getBoxItems(nextState, 'system-links').length, 2);
  assert.equal(getBoxItems(nextState, 'system-links')[0].id, sourceItem.id);
  assert.equal(getBoxItems(nextState, 'system-links')[0].isPinned, true);
  assert.equal(nextState.itemsById[sourceItem.id].type, 'folder');
});

test('workspace export document round-trips with current schema', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const document = createWorkspaceExportDocument(snapshot);
  const parsed = parseWorkspaceExportDocument(document);

  assert.equal(parsed.version, WORKSPACE_EXPORT_VERSION);
  assert.equal(parsed.boxes.length, 1);
  assert.equal(parsed.boxes[0].customTitle, null);
});

test('workspace snapshot parser accepts current schema payloads', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const parsed = parseWorkspaceSnapshot(snapshot);

  assert.ok(parsed);
  assert.equal(parsed?.schemaVersion, WORKSPACE_SCHEMA_VERSION);
  assert.equal(parseWorkspaceSnapshot({ version: 2, boxes: [] }), null);
});
