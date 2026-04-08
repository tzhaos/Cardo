import assert from 'node:assert/strict';
import test from 'node:test';
import { openItem } from './openItem';
import { clipboardPort, localResourcePort, tabsPort } from '../ports/defaultPorts';
import type { WorkspaceItem } from '../../domains/items/model/item';

function makeItem(overrides: Partial<WorkspaceItem> = {}): WorkspaceItem {
  return {
    id: 'test-1',
    type: 'url',
    title: 'Test',
    content: 'https://example.com',
    isPinned: false,
    ...overrides,
  };
}

test('openItem opens URL via tabs port', async (t) => {
  const mock = t.mock.method(tabsPort, 'openUrl', () => {});
  const result = await openItem(makeItem({ type: 'url', content: 'https://x.test' }));

  assert.equal(result.status, 'opened-url');
  assert.equal(mock.mock.callCount(), 1);
  assert.equal(mock.mock.calls[0].arguments[0], 'https://x.test');
});

test('openItem copies note text to clipboard', async (t) => {
  const mock = t.mock.method(clipboardPort, 'writeText', async () => {});
  const result = await openItem(makeItem({ type: 'note', content: 'hello' }));

  assert.equal(result.status, 'copied-note');
  assert.equal(mock.mock.callCount(), 1);
  assert.equal(mock.mock.calls[0].arguments[0], 'hello');
});

test('openItem requests local resource open for file', async (t) => {
  t.mock.method(localResourcePort, 'requestOpen', () => ({ status: 'requested' as const }));
  const result = await openItem(makeItem({ type: 'file', content: 'C:\\test.txt' }));

  assert.equal(result.status, 'requested-local-resource');
});

test('openItem requests local resource open for folder', async (t) => {
  t.mock.method(localResourcePort, 'requestOpen', () => ({ status: 'requested' as const }));
  const result = await openItem(makeItem({ type: 'folder', content: 'C:\\docs' }));

  assert.equal(result.status, 'requested-local-resource');
});

test('openItem returns failed when local resource port fails', async (t) => {
  t.mock.method(localResourcePort, 'requestOpen', () => ({
    status: 'failed' as const,
    errorMessage: 'Not found',
  }));
  const result = await openItem(makeItem({ type: 'file', content: 'C:\\missing' }));

  assert.equal(result.status, 'failed');
  assert.equal((result as { errorMessage: string }).errorMessage, 'Not found');
});

test('openItem catches thrown errors and returns failed', async (t) => {
  t.mock.method(tabsPort, 'openUrl', () => {
    throw new Error('boom');
  });
  const result = await openItem(makeItem({ type: 'url' }));

  assert.equal(result.status, 'failed');
  assert.equal((result as { errorMessage: string }).errorMessage, 'boom');
});
