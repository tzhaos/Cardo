import assert from 'node:assert/strict';
import test from 'node:test';
import { importWorkspace } from './importWorkspace';
import { fileImportPort, workspaceStoragePort } from '../ports/defaultPorts';

const VALID_EXPORT = JSON.stringify({
  version: 3,
  boxes: [
    {
      id: 'b1',
      customTitle: 'Test Box',
      itemIds: ['i1'],
    },
  ],
  items: [
    {
      id: 'i1',
      type: 'url',
      title: 'Example',
      url: 'https://example.com',
    },
  ],
  itemPlacementsByBoxId: {
    b1: [{ itemId: 'i1', isPinned: false }],
  },
  boxViewStates: [
    {
      boxId: 'b1',
      bounds: { x: 100, y: 100, width: 320, height: 400 },
      isLocked: false,
      isCollapsed: false,
      isMinimized: false,
      layout: 'list',
      zIndex: 1,
    },
  ],
});

test('importWorkspace parses valid export and returns document', async (t) => {
  t.mock.method(fileImportPort, 'readText', async () => VALID_EXPORT);
  t.mock.method(workspaceStoragePort, 'setItem', async () => {});
  const file = new File([''], 'backup.json');
  const result = await importWorkspace(file);

  assert.equal(result.version, 4);
  assert.equal(result.boxes.length, 1);
  assert.equal(result.boxes[0].templateId, 'collection');
  assert.equal(result.items.length, 1);
  assert.equal(result.itemPlacementsByBoxId.b1.length, 1);
});

test('importWorkspace throws on invalid JSON', async (t) => {
  t.mock.method(fileImportPort, 'readText', async () => 'not json');
  const file = new File([''], 'bad.json');

  await assert.rejects(() => importWorkspace(file));
});

test('importWorkspace throws on wrong export version', async (t) => {
  t.mock.method(fileImportPort, 'readText', async () => JSON.stringify({ version: 99, boxes: [] }));
  const file = new File([''], 'wrong.json');

  await assert.rejects(() => importWorkspace(file), {
    message: 'Invalid workspace export document',
  });
});
