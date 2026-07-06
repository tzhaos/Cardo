import assert from 'node:assert/strict';
import test from 'node:test';
import { createBookmark } from './createBookmark';
import { getFrequentBookmarks } from './frequentBookmarks';
import { isBookmarkUrl, normalizeBookmarkUrl } from './normalizeBookmarkUrl';

test('normalizeBookmarkUrl removes fragments and normalizes host casing', () => {
  assert.equal(
    normalizeBookmarkUrl('HTTPS://Example.COM:443/docs/#section'),
    'https://example.com/docs',
  );
});

test('isBookmarkUrl accepts browser bookmark URLs only', () => {
  assert.equal(isBookmarkUrl('https://example.com'), true);
  assert.equal(isBookmarkUrl('http://example.com'), true);
  assert.equal(isBookmarkUrl('file:///tmp/readme.md'), false);
  assert.equal(isBookmarkUrl('not a url'), false);
});

test('getFrequentBookmarks keeps pinned sites first then ranks usage signals', () => {
  const now = new Date('2026-02-01T00:00:00.000Z');
  const pinned = createBookmark('bookmark-pinned', {
    title: 'Pinned',
    url: 'https://pinned.example',
    isPinned: true,
  });
  const frequent = createBookmark('bookmark-frequent', {
    title: 'Frequent',
    url: 'https://frequent.example',
    openCount: 10,
  });
  const recent = createBookmark('bookmark-recent', {
    title: 'Recent',
    url: 'https://recent.example',
    lastOpenedAt: '2026-01-31T00:00:00.000Z',
  });

  assert.deepEqual(
    getFrequentBookmarks([recent, frequent, pinned], 3, now).map((bookmark) => bookmark.id),
    ['bookmark-pinned', 'bookmark-frequent', 'bookmark-recent'],
  );
});
