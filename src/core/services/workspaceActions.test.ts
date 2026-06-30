import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialWorkspaceSnapshot } from '../domains/workspace/model/createInitialWorkspaceSnapshot';
import { createPasteTextCommand, createWorkspaceBoxCommand } from './workspaceActions';

test('createPasteTextCommand targets inbox when no box is active', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const result = createPasteTextCommand(snapshot, 'Inbox note', null, () => 'item-1');

  assert.equal(result?.boxId, 'default-inbox');
});

test('createWorkspaceBoxCommand creates inbox boxes as triage lists', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  const result = createWorkspaceBoxCommand(
    snapshot,
    { centerX: 100, centerY: 100, templateId: 'inbox' },
    () => 'box-inbox',
  );

  assert.equal(result.status, 'created');

  if (result.status === 'created') {
    assert.equal(result.box.layout, 'list');
  }
});
