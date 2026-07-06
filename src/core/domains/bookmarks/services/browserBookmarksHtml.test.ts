import assert from 'node:assert/strict';
import test from 'node:test';
import { exportBrowserBookmarksHtml, parseBrowserBookmarksHtml } from './browserBookmarksHtml';

function createSequentialId(prefix: string) {
  let nextId = 0;
  return (requestedPrefix: string) => `${requestedPrefix}-${prefix}-${(nextId += 1)}`;
}

test('parseBrowserBookmarksHtml imports folders and valid links', () => {
  const result = parseBrowserBookmarksHtml(
    `
      <!DOCTYPE NETSCAPE-Bookmark-file-1>
      <DL><p>
        <DT><H3 ADD_DATE="1767225600">Docs</H3>
        <DL><p>
          <DT><A HREF="https://example.com/docs#intro" ADD_DATE="1767312000">Example &amp; Docs</A>
          <DT><A HREF="file:///tmp/readme.md">Local file</A>
        </DL><p>
      </DL><p>
    `,
    createSequentialId('import'),
    new Date('2026-01-03T00:00:00.000Z'),
  );

  assert.equal(result.folders.length, 1);
  assert.equal(result.folders[0].title, 'Docs');
  assert.equal(result.bookmarks.length, 1);
  assert.equal(result.bookmarks[0].title, 'Example & Docs');
  assert.equal(result.bookmarks[0].normalizedUrl, 'https://example.com/docs');
  assert.equal(result.bookmarks[0].folderId, result.folders[0].id);
  assert.equal(result.invalidUrlCount, 1);
});

test('exportBrowserBookmarksHtml writes browser importable bookmark HTML', () => {
  const parsed = parseBrowserBookmarksHtml(
    `
      <DL><p>
        <DT><H3>Reading</H3>
        <DL><p>
          <DT><A HREF="https://example.com/a">A &amp; B</A>
        </DL><p>
        <DT><A HREF="https://root.example">Root</A>
      </DL><p>
    `,
    createSequentialId('export'),
    new Date('2026-01-03T00:00:00.000Z'),
  );
  const html = exportBrowserBookmarksHtml(parsed.bookmarks, parsed.folders, parsed.folderOrder);

  assert.match(html, /<!DOCTYPE NETSCAPE-Bookmark-file-1>/);
  assert.match(html, /<DT><H3 ADD_DATE="\d+">Reading<\/H3>/);
  assert.match(html, /<DT><A HREF="https:\/\/example.com\/a" ADD_DATE="\d+">A &amp; B<\/A>/);
  assert.match(html, /<DT><A HREF="https:\/\/root.example" ADD_DATE="\d+">Root<\/A>/);
});
