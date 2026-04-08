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
      }),
    /Invalid workspace export document/,
  );
});

test('parseWorkspaceExportDocument accepts empty box list', () => {
  const doc = parseWorkspaceExportDocument({
    version: WORKSPACE_EXPORT_VERSION,
    boxes: [],
  });
  assert.equal(doc.boxes.length, 0);
  assert.equal(doc.version, WORKSPACE_EXPORT_VERSION);
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
