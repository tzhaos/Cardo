import assert from 'node:assert/strict';
import test from 'node:test';
import {
  migrateLegacyWorkspaceDocument,
  migrateLegacyWorkspaceSnapshot,
} from './workspaceMigration';

test('migration converts legacy workspace arrays into export document v3', () => {
  const document = migrateLegacyWorkspaceDocument([
    {
      id: 'webpages',
      title: '链接',
      x: 24,
      y: 48,
      width: 180,
      height: 120,
      isLocked: false,
      isCollapsed: false,
      isMinimized: false,
      layout: 'list',
      items: [],
      zIndex: 4,
    },
  ]);

  assert.equal(document.version, 3);
  assert.equal('role' in document.boxes[0], false);
  assert.equal(document.boxes[0].customTitle, 'Links');
  assert.equal(document.boxViewStates[0].bounds.width, 200);
  assert.equal(document.boxViewStates[0].bounds.height, 150);
});

test('migration converts legacy normalized snapshots into schema version 5 snapshots', () => {
  const snapshot = migrateLegacyWorkspaceSnapshot({
    version: 2,
    boxesById: {
      clipboard: {
        id: 'clipboard',
        title: 'Notes',
        x: 200,
        y: 240,
        width: 320,
        height: 400,
        theme: 'dark',
        isLocked: false,
        isCollapsed: false,
        isMinimized: false,
        layout: 'list',
        items: [],
        zIndex: 9,
      },
    },
    boxOrder: ['clipboard'],
    maxZIndex: 9,
  });

  assert.equal(snapshot.schemaVersion, 5);
  assert.deepEqual(snapshot.boxOrder, ['clipboard']);
  assert.equal('role' in snapshot.boxesById.clipboard, false);
  assert.equal(snapshot.boxesById.clipboard.customTitle, 'Notes');
  assert.equal(snapshot.maxZIndex, 9);
  // Verify legacy theme field is not present in migrated box
  assert.equal('theme' in snapshot.boxesById.clipboard, false);
});

test('migration strips roles from export v3 documents without dropping items', () => {
  const document = migrateLegacyWorkspaceDocument({
    version: 3,
    boxes: [
      {
        id: 'webpages',
        role: 'links',
        customTitle: null,
        itemIds: ['item-1'],
      },
    ],
    items: [
      {
        id: 'item-1',
        type: 'url',
        title: 'Example',
        url: 'https://example.com',
      },
    ],
    itemPlacementsByBoxId: {
      webpages: [{ itemId: 'item-1', isPinned: true }],
    },
    boxViewStates: [
      {
        boxId: 'webpages',
        bounds: { x: 10, y: 20, width: 320, height: 400 },
        isLocked: false,
        isCollapsed: false,
        isMinimized: false,
        layout: 'list',
        zIndex: 2,
      },
    ],
  });

  assert.equal(document.version, 3);
  assert.equal('role' in document.boxes[0], false);
  assert.equal(document.boxes[0].customTitle, 'Links');
  assert.equal(document.items.length, 1);
  assert.equal(document.items[0].id, 'item-1');
  assert.equal(document.itemPlacementsByBoxId.webpages[0].itemId, 'item-1');
});
