import assert from 'node:assert/strict';
import test from 'node:test';
import type { WorkspaceItem } from '../../../core/domains/items/model/item';
import { clipboardPort, localResourcePort, tabsPort } from '../ports/defaultPorts';
import { openItem } from './openItem';

const urlItem = {
  id: 'test-url',
  type: 'url',
  title: 'Test',
  url: 'https://example.com',
} satisfies WorkspaceItem;

test('openItem opens URL via tabs port', async (t) => {
  const mock = t.mock.method(tabsPort, 'openUrl', () => {});
  const result = await openItem({ ...urlItem, url: 'https://x.test' });

  assert.equal(result.status, 'opened-url');
  assert.equal(mock.mock.callCount(), 1);
  assert.equal(mock.mock.calls[0].arguments[0], 'https://x.test');
});

test('openItem copies note text to clipboard', async (t) => {
  const mock = t.mock.method(clipboardPort, 'writeText', async () => {});
  const result = await openItem({
    id: 'test-note',
    type: 'note',
    title: 'Note',
    text: 'hello',
  });

  assert.equal(result.status, 'copied-note');
  assert.equal(mock.mock.callCount(), 1);
  assert.equal(mock.mock.calls[0].arguments[0], 'hello');
});

test('openItem requests local resource open for file', async (t) => {
  t.mock.method(localResourcePort, 'requestOpen', () => ({ status: 'requested' as const }));
  const result = await openItem({
    id: 'test-file',
    type: 'file',
    title: 'File',
    path: 'C:\\test.txt',
  });

  assert.equal(result.status, 'requested-local-resource');
});

test('openItem requests local resource open for folder', async (t) => {
  t.mock.method(localResourcePort, 'requestOpen', () => ({ status: 'requested' as const }));
  const result = await openItem({
    id: 'test-folder',
    type: 'folder',
    title: 'Folder',
    path: 'C:\\docs',
  });

  assert.equal(result.status, 'requested-local-resource');
});

test('openItem requests local resource open for shortcut', async (t) => {
  const mock = t.mock.method(localResourcePort, 'requestOpen', () => ({
    status: 'requested' as const,
  }));
  const result = await openItem({
    id: 'test-shortcut',
    type: 'shortcut',
    title: 'Shortcut',
    path: 'C:\\Tools\\app.exe',
  });

  assert.equal(result.status, 'requested-local-resource');
  assert.equal(mock.mock.calls[0].arguments[0], 'C:\\Tools\\app.exe');
});

test('openItem returns failed when local resource port fails', async (t) => {
  t.mock.method(localResourcePort, 'requestOpen', () => ({
    status: 'failed' as const,
    errorMessage: 'Not found',
  }));
  const result = await openItem({
    id: 'missing-file',
    type: 'file',
    title: 'Missing',
    path: 'C:\\missing',
  });

  assert.equal(result.status, 'failed');
  assert.equal((result as { errorMessage: string }).errorMessage, 'Not found');
});

test('openItem catches thrown errors and returns failed', async (t) => {
  t.mock.method(tabsPort, 'openUrl', () => {
    throw new Error('boom');
  });
  const result = await openItem(urlItem);

  assert.equal(result.status, 'failed');
  assert.equal((result as { errorMessage: string }).errorMessage, 'boom');
});
