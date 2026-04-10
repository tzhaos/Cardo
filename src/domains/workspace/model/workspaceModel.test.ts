import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkspaceItem } from '../../items/model/item';
import {
  createInitialWorkspaceSnapshot,
  createWorkspaceSnapshot,
} from './createInitialWorkspaceSnapshot';
import { reduceWorkspace } from './reduceWorkspace';
import {
  createWorkspaceExportDocument,
  parseWorkspaceExportDocument,
  parseWorkspaceSnapshot,
} from './workspaceCodec';

test('workspace reducer adds, updates, pins, and deletes items immutably', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const noteItem = createWorkspaceItem('item-note', {
    type: 'note',
    title: 'Scratch',
    content: 'Initial note',
  });

  const withItem = reduceWorkspace(snapshot, {
    type: 'item.add',
    boxId: 'system-notes',
    item: noteItem,
  });
  assert.equal(withItem.boxesById['system-notes'].items.length, 1);
  assert.equal(withItem.boxesById['system-notes'].items[0].title, 'Scratch');

  const withUpdatedItem = reduceWorkspace(withItem, {
    type: 'item.update',
    boxId: 'system-notes',
    itemId: noteItem.id,
    updates: {
      title: 'Updated scratch',
      content: 'Updated note',
    },
  });
  assert.equal(withUpdatedItem.boxesById['system-notes'].items[0].title, 'Updated scratch');
  assert.equal(withUpdatedItem.boxesById['system-notes'].items[0].content, 'Updated note');

  const withPinnedItem = reduceWorkspace(withUpdatedItem, {
    type: 'item.setPinned',
    boxId: 'system-notes',
    itemId: noteItem.id,
    isPinned: true,
  });
  assert.equal(withPinnedItem.boxesById['system-notes'].items[0].isPinned, true);

  const withoutItem = reduceWorkspace(withPinnedItem, {
    type: 'item.delete',
    boxId: 'system-notes',
    itemId: noteItem.id,
  });
  assert.equal(withoutItem.boxesById['system-notes'].items.length, 0);
});

test('move item inherits pin state without mutating the original item reference', () => {
  const baseline = createInitialWorkspaceSnapshot();
  const sourceItem = createWorkspaceItem('item-source', {
    type: 'folder',
    title: 'Source',
    content: 'C:\\Source',
    isPinned: false,
  });
  const pinnedTarget = createWorkspaceItem('item-target', {
    type: 'url',
    title: 'Pinned target',
    content: 'https://example.com',
    isPinned: true,
  });

  const snapshot = createWorkspaceSnapshot([
    {
      ...baseline.boxesById['system-folders'],
      items: [sourceItem],
    },
    {
      ...baseline.boxesById['system-links'],
      items: [pinnedTarget],
    },
    baseline.boxesById['system-notes'],
  ]);

  const nextState = reduceWorkspace(snapshot, {
    type: 'item.move',
    itemId: sourceItem.id,
    sourceBoxId: 'system-folders',
    targetBoxId: 'system-links',
    targetIndex: 0,
  });

  assert.equal(snapshot.boxesById['system-folders'].items[0].isPinned, false);
  assert.equal(nextState.boxesById['system-folders'].items.length, 0);
  assert.equal(nextState.boxesById['system-links'].items.length, 2);
  assert.equal(nextState.boxesById['system-links'].items[0].id, sourceItem.id);
  assert.equal(nextState.boxesById['system-links'].items[0].isPinned, true);
});

test('workspace export document round-trips with current schema', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const document = createWorkspaceExportDocument(snapshot);
  const parsed = parseWorkspaceExportDocument(document);

  assert.equal(parsed.version, 2);
  assert.equal(parsed.boxes.length, 3);
  assert.equal(parsed.boxes[1].role, 'links');
});

test('workspace snapshot parser accepts current schema payloads', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const parsed = parseWorkspaceSnapshot(snapshot);

  assert.ok(parsed);
  assert.equal(parsed?.schemaVersion, 4);
  assert.equal(parseWorkspaceSnapshot({ version: 2, boxes: [] }), null);
});
