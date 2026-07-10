import assert from 'node:assert/strict';
import test from 'node:test';
import { createPasteDraftForBox } from './paste';
import type { WorkspaceBox, WorkspaceBoxType } from './workspace';

function createBox(type: WorkspaceBoxType): WorkspaceBox {
  return {
    id: `box-${type}`,
    pageId: 'page-1',
    type,
    title: `${type} box`,
    frame: { x: 0, y: 0, width: 320, height: 240 },
    items: [],
    createdAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z',
  };
}

test('folder boxes create items from local paths', () => {
  assert.deepEqual(createPasteDraftForBox(createBox('folder'), 'C:\\Workspace\\KhaosBox'), {
    title: 'KhaosBox',
    path: 'C:\\Workspace\\KhaosBox',
    kind: 'folder',
  });
});

test('bookmark boxes create items from URLs', () => {
  assert.deepEqual(createPasteDraftForBox(createBox('bookmark'), 'https://www.openai.com/docs'), {
    title: 'openai',
    url: 'https://www.openai.com/docs',
  });
});

test('clipboard boxes create items from plain text', () => {
  assert.deepEqual(createPasteDraftForBox(createBox('clipboard'), 'Reusable clipboard text'), {
    title: '',
    text: 'Reusable clipboard text',
  });
});

test('specialized boxes reject incompatible pasted content', () => {
  assert.equal(createPasteDraftForBox(createBox('folder'), 'https://openai.com'), null);
  assert.equal(createPasteDraftForBox(createBox('folder'), 'C:\\Workspace\\notes.txt'), null);
  assert.equal(createPasteDraftForBox(createBox('bookmark'), 'plain text'), null);
  assert.equal(createPasteDraftForBox(createBox('clipboard'), 'C:\\Workspace\\KhaosBox'), null);
  assert.equal(createPasteDraftForBox(createBox('clipboard'), 'https://openai.com'), null);
});
