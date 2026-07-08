import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialWorkspaceSnapshot } from '../domains/workspace/model/createInitialWorkspaceSnapshot';
import { createPasteTextCommand, createWorkspaceBoxCommand } from './workspaceActions';

test('createPasteTextCommand targets the first folders box when no box is active', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const result = createPasteTextCommand(snapshot, 'Loose note', null, () => 'item-1');

  assert.equal(result?.boxId, 'default-collection-folders');
});

test('createWorkspaceBoxCommand creates product page boxes', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const result = createWorkspaceBoxCommand(
    snapshot,
    { centerX: 100, centerY: 100, templateId: 'launcher' },
    () => 'box-launcher',
  );

  assert.equal(result.status, 'created');

  if (result.status === 'created') {
    assert.equal(result.box.layout, 'grid');
    assert.equal(result.box.templateId, 'launcher');
  }
});
