import assert from 'node:assert/strict';
import test from 'node:test';
import { migrateLegacyWorkspaceDocument, migrateLegacyWorkspaceSnapshot } from './workspaceMigration';

test('migration converts legacy workspace arrays into export document v2', () => {
  const document = migrateLegacyWorkspaceDocument([
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
  ]);

  assert.equal(document.version, 2);
  assert.equal(document.boxes[0].role, 'links');
  assert.equal(document.boxes[0].customTitle, null);
  assert.equal(document.boxes[0].bounds.width, 200);
  assert.equal(document.boxes[0].bounds.height, 150);
});

test('migration converts legacy normalized snapshots into schema version 3 snapshots', () => {
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
        isMinimized: false,
        layout: 'list',
        items: [],
        zIndex: 9,
      },
    },
    boxOrder: ['clipboard'],
    maxZIndex: 9,
  });

  assert.equal(snapshot.schemaVersion, 3);
  assert.deepEqual(snapshot.boxOrder, ['clipboard']);
  assert.equal(snapshot.boxesById.clipboard.role, 'notes');
  assert.equal(snapshot.boxesById.clipboard.customTitle, null);
  assert.equal(snapshot.maxZIndex, 9);
});
