import assert from 'node:assert/strict';
import test from 'node:test';
import { WORKSPACE_EXPORT_VERSION, WORKSPACE_SCHEMA_VERSION } from './workspace';
import { parseWorkspaceExportDocument, parseWorkspaceSnapshot } from './workspaceCodec';

test('parseWorkspaceExportDocument rejects wrong version', () => {
  assert.throws(
    () =>
      parseWorkspaceExportDocument({
        version: 99,
        boxes: [],
      }),
    /Invalid workspace export document/,
  );
});

test('parseWorkspaceExportDocument rejects non-object root', () => {
  assert.throws(() => parseWorkspaceExportDocument(null), /Invalid workspace export document/);
  assert.throws(() => parseWorkspaceExportDocument('{}'), /Invalid workspace export document/);
});

test('parseWorkspaceExportDocument rejects invalid box entries', () => {
  assert.throws(
    () =>
      parseWorkspaceExportDocument({
        version: WORKSPACE_EXPORT_VERSION,
        boxes: [{}],
        items: [],
      }),
    /Invalid workspace export document/,
  );
});

test('parseWorkspaceExportDocument accepts empty box list', () => {
  const doc = parseWorkspaceExportDocument({
    version: WORKSPACE_EXPORT_VERSION,
    boxes: [],
    items: [],
    itemPlacementsByBoxId: {},
    boxViewStates: [],
  });
  assert.equal(doc.boxes.length, 0);
  assert.equal(doc.version, WORKSPACE_EXPORT_VERSION);
});

test('parseWorkspaceExportDocument accepts legacy exports with itemIds only', () => {
  const doc = parseWorkspaceExportDocument({
    version: 3,
    boxes: [{ id: 'box-1', customTitle: null, itemIds: ['item-1'] }],
    items: [{ id: 'item-1', type: 'note', title: 'Note', text: 'Hello' }],
    boxViewStates: [
      {
        boxId: 'box-1',
        bounds: { x: 10, y: 20, width: 320, height: 400 },
        isLocked: false,
        isCollapsed: false,
        isMinimized: true,
        layout: 'list',
        zIndex: 1,
      },
    ],
  });

  assert.equal(doc.version, WORKSPACE_EXPORT_VERSION);
  assert.equal(doc.boxes[0].templateId, 'collection');
  assert.deepEqual(doc.itemPlacementsByBoxId['box-1'], [{ itemId: 'item-1', isPinned: false }]);
});

test('parseWorkspaceSnapshot returns null for wrong schema version', () => {
  assert.equal(
    parseWorkspaceSnapshot({
      schemaVersion: 2,
      boxesById: {},
      boxOrder: [],
      maxZIndex: 0,
    }),
    null,
  );
});

test('parseWorkspaceSnapshot returns null when boxesById or boxOrder missing', () => {
  assert.equal(parseWorkspaceSnapshot({ schemaVersion: WORKSPACE_SCHEMA_VERSION }), null);
  assert.equal(
    parseWorkspaceSnapshot({
      schemaVersion: WORKSPACE_SCHEMA_VERSION,
      boxesById: {},
    }),
    null,
  );
});

test('parseWorkspaceSnapshot returns null for non-object input', () => {
  assert.equal(parseWorkspaceSnapshot(null), null);
  assert.equal(parseWorkspaceSnapshot('state'), null);
});

test('parseWorkspaceSnapshot rejects legacy schema version 3 payloads', () => {
  const parsed = parseWorkspaceSnapshot({
    schemaVersion: 3,
    boxesById: {
      box1: {
        id: 'box1',
        role: null,
        customTitle: null,
        bounds: { x: 20, y: 40, width: 320, height: 400 },
        isLocked: false,
        isMinimized: false,
        layout: 'list',
        zIndex: 1,
        items: [],
      },
    },
    boxOrder: ['box1'],
    maxZIndex: 1,
  });

  assert.equal(parsed, null);
});
