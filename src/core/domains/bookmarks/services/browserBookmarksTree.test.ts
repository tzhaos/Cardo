import assert from 'node:assert/strict';
import test from 'node:test';
import { parseBrowserBookmarksTree } from './browserBookmarksTree';

function createSequentialId() {
  let nextId = 0;
  return (prefix: string) => `${prefix}-tree-${(nextId += 1)}`;
}

test('parseBrowserBookmarksTree imports browser folders and valid links', () => {
  const result = parseBrowserBookmarksTree(
    [
      {
        title: '',
        children: [
          {
            title: 'Bookmarks Bar',
            dateAdded: Date.parse('2026-01-01T00:00:00.000Z'),
            children: [
              {
                title: 'Docs',
                dateAdded: Date.parse('2026-01-02T00:00:00.000Z'),
                children: [
                  {
                    title: 'Example Docs',
                    url: 'https://Example.com/docs#intro',
                    dateAdded: Date.parse('2026-01-03T00:00:00.000Z'),
                  },
                  {
                    title: 'Local file',
                    url: 'file:///tmp/readme.md',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    createSequentialId(),
    new Date('2026-01-04T00:00:00.000Z'),
  );

  assert.equal(result.folders.length, 2);
  assert.equal(result.folders[0].title, 'Bookmarks Bar');
  assert.equal(result.folders[1].title, 'Docs');
  assert.equal(result.folders[1].parentId, result.folders[0].id);
  assert.equal(result.bookmarks.length, 1);
  assert.equal(result.bookmarks[0].title, 'Example Docs');
  assert.equal(result.bookmarks[0].normalizedUrl, 'https://example.com/docs');
  assert.equal(result.bookmarks[0].folderId, result.folders[1].id);
  assert.equal(result.invalidUrlCount, 1);
});
