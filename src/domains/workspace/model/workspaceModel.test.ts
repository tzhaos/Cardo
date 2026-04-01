import assert from 'node:assert/strict';
import test from 'node:test';
import { createItem } from '../../items/services/createItem';
import { createInitialBoxes, DEFAULT_BOX_THEME } from './defaultBoxes';
import { addItem, addPastedItem, deleteItem, moveItem, setItemPinned, updateItem } from './workspaceCommands';
import {
  WorkspaceImportError,
  normalizePersistedWorkspaceSnapshot,
  parseImportedWorkspaceBoxes,
} from './workspaceSchema';
import {
  createWorkspaceDataState,
  createWorkspaceExportPayload,
  WORKSPACE_STATE_VERSION,
} from './workspaceState';

test('addPastedItem routes URL text to the links system box role', () => {
  const snapshot = createWorkspaceDataState(createInitialBoxes(), WORKSPACE_STATE_VERSION);
  const nextState = addPastedItem(snapshot, null, 'https://example.com/docs');

  assert.equal(nextState.targetBoxId, 'webpages');
  assert.equal(nextState.boxesById.webpages.items.length, 1);
  assert.equal(nextState.boxesById.webpages.items[0]?.type, 'url');
});

test('item commands add, update, pin, and delete items without direct array mutation in UI', () => {
  const snapshot = createWorkspaceDataState(createInitialBoxes(), WORKSPACE_STATE_VERSION);
  const createdItem = createItem({
    type: 'note',
    title: 'Scratch',
    content: 'Initial note',
  });

  const withItem = addItem(snapshot, 'clipboard', createdItem);
  assert.equal(withItem.boxesById.clipboard.items.length, 1);
  assert.equal(withItem.boxesById.clipboard.items[0].title, 'Scratch');

  const withUpdatedItem = updateItem(withItem, 'clipboard', createdItem.id, {
    title: 'Updated scratch',
    content: 'Updated note',
  });
  assert.equal(withUpdatedItem.boxesById.clipboard.items[0].title, 'Updated scratch');
  assert.equal(withUpdatedItem.boxesById.clipboard.items[0].content, 'Updated note');

  const withPinnedItem = setItemPinned(withUpdatedItem, 'clipboard', createdItem.id, true);
  assert.equal(withPinnedItem.boxesById.clipboard.items[0].isPinned, true);

  const withoutItem = deleteItem(withPinnedItem, 'clipboard', createdItem.id);
  assert.equal(withoutItem.boxesById.clipboard.items.length, 0);
});

test('moveItem moves an item between boxes and inherits the reference pin state', () => {
  const boxes = createInitialBoxes().map((box) => ({ ...box, items: [...box.items] }));

  boxes[0].items = [
    createItem({
      type: 'folder',
      title: 'Source',
      content: 'C:/Source',
      isPinned: false,
    }),
  ];
  boxes[1].items = [
    createItem({
      type: 'url',
      title: 'Pinned target',
      content: 'https://example.com',
      isPinned: true,
    }),
  ];

  const sourceItemId = boxes[0].items[0].id;
  const snapshot = createWorkspaceDataState(boxes, WORKSPACE_STATE_VERSION);
  const nextState = moveItem(snapshot, sourceItemId, 'folders', 'webpages', 0);

  assert.equal(nextState.boxesById.folders.items.length, 0);
  assert.equal(nextState.boxesById.webpages.items.length, 2);
  assert.equal(nextState.boxesById.webpages.items[0].id, sourceItemId);
  assert.equal(nextState.boxesById.webpages.items[0].isPinned, true);
});

test('normalizePersistedWorkspaceSnapshot migrates legacy array state to versioned normalized state', () => {
  const normalized = normalizePersistedWorkspaceSnapshot({
    boxes: [
      {
        id: 'webpages',
        title: '链接',
        x: 24,
        y: 48,
        width: 180,
        height: 120,
        theme: '',
        isLocked: false,
        isMinimized: false,
        layout: 'list',
        items: [],
        zIndex: 4,
      },
    ],
    maxZIndex: 1,
  });

  assert.equal(normalized.version, WORKSPACE_STATE_VERSION);
  assert.deepEqual(normalized.boxOrder, ['webpages']);
  assert.equal(normalized.boxesById.webpages.role, 'links');
  assert.equal(normalized.boxesById.webpages.title, 'Links');
  assert.equal(normalized.boxesById.webpages.width, 200);
  assert.equal(normalized.boxesById.webpages.height, 150);
  assert.equal(normalized.boxesById.webpages.theme, DEFAULT_BOX_THEME);
  assert.equal(normalized.maxZIndex, 4);
});

test('parseImportedWorkspaceBoxes accepts versioned export payloads', () => {
  const snapshot = createWorkspaceDataState(createInitialBoxes(), WORKSPACE_STATE_VERSION);
  const payload = createWorkspaceExportPayload(snapshot);
  const importedBoxes = parseImportedWorkspaceBoxes(payload);

  assert.equal(importedBoxes.length, 3);
  assert.equal(importedBoxes[1].role, 'links');
});

test('parseImportedWorkspaceBoxes rejects invalid payloads', () => {
  assert.throws(
    () =>
      parseImportedWorkspaceBoxes({
        version: WORKSPACE_STATE_VERSION,
        boxes: [{ items: [{ type: 'note' }] }],
      }),
    WorkspaceImportError,
  );
});
