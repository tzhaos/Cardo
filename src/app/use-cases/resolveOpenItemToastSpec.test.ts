import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveOpenItemToastSpec } from './resolveOpenItemToastSpec';
import type { OpenItemResult } from './openItem';
import type { WorkspaceItem } from '../../domains/items/model/item';

const baseItem: WorkspaceItem = {
  id: 'i1',
  type: 'url',
  title: 'T',
  content: 'https://x.test',
  isPinned: false,
};

test('resolveOpenItemToastSpec returns null for opened-url', () => {
  const result: OpenItemResult = { status: 'opened-url' };
  assert.equal(resolveOpenItemToastSpec(result, baseItem), null);
});

test('resolveOpenItemToastSpec maps copied-note', () => {
  const result: OpenItemResult = { status: 'copied-note' };
  assert.deepEqual(resolveOpenItemToastSpec(result, baseItem), {
    level: 'success',
    messageKey: 'toast.copiedToClipboard',
  });
});

test('resolveOpenItemToastSpec maps requested-local-resource', () => {
  const result: OpenItemResult = { status: 'requested-local-resource' };
  const item = { ...baseItem, title: 'Doc' };
  assert.deepEqual(resolveOpenItemToastSpec(result, item), {
    level: 'message',
    messageKey: 'toast.requestedLocalResource',
    params: { title: 'Doc' },
  });
});

test('resolveOpenItemToastSpec maps failed', () => {
  const result: OpenItemResult = { status: 'failed', errorMessage: 'x' };
  const item = { ...baseItem, title: 'X' };
  assert.deepEqual(resolveOpenItemToastSpec(result, item), {
    level: 'error',
    messageKey: 'toast.unableToOpen',
    params: { title: 'X' },
  });
});
