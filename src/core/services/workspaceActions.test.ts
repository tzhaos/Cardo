import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialWorkspaceSnapshot } from '../domains/workspace/model/createInitialWorkspaceSnapshot';
import { reduceWorkspace } from '../domains/workspace/model/reduceWorkspace';
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

test('createWorkspaceBoxCommand creates project boards with starter structure', () => {
  const snapshot = createInitialWorkspaceSnapshot();
  let nextId = 0;
  const result = createWorkspaceBoxCommand(
    snapshot,
    { centerX: 100, centerY: 100, templateId: 'project-board' },
    (prefix) => `${prefix}-${(nextId += 1)}`,
  );

  assert.equal(result.status, 'created');

  if (result.status === 'created') {
    assert.equal(result.box.id, 'box-1');
    const command = result.command;

    assert.equal(command.type, 'box.create');
    if (command.type !== 'box.create') {
      assert.fail('Expected box.create command');
    }

    assert.deepEqual(
      result.box.templateState.kanbanColumns?.map((column) => column.id),
      ['backlog', 'doing', 'review', 'done'],
    );
    assert.equal(command.items?.[0]?.title, 'Project brief');
    assert.deepEqual(command.placements, [
      { itemId: 'item-2', isPinned: true, columnId: 'backlog' },
    ]);

    const nextSnapshot = reduceWorkspace(snapshot, command);
    assert.equal(nextSnapshot.itemsById['item-2']?.title, 'Project brief');
    assert.deepEqual(nextSnapshot.itemPlacementsByBoxId['box-1'], [
      { itemId: 'item-2', isPinned: true, columnId: 'backlog' },
    ]);
  }
});
