import assert from 'node:assert/strict';
import test from 'node:test';
import { getInitialFocusItemId } from './createWorkspaceBox';

test('getInitialFocusItemId prefers pinned created items', () => {
  assert.equal(
    getInitialFocusItemId([
      { itemId: 'item-1', isPinned: false },
      { itemId: 'item-2', isPinned: true },
    ]),
    'item-2',
  );
});

test('getInitialFocusItemId falls back to the first created item', () => {
  assert.equal(
    getInitialFocusItemId([
      { itemId: 'item-1', isPinned: false },
      { itemId: 'item-2', isPinned: false },
    ]),
    'item-1',
  );
});

test('getInitialFocusItemId returns null when no items were created', () => {
  assert.equal(getInitialFocusItemId([]), null);
});
