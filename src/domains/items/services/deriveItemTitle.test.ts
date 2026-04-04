import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveItemTitle } from './deriveItemTitle';

test('deriveItemTitle returns "Untitled" for empty content', () => {
  assert.equal(deriveItemTitle('file', ''), 'Untitled');
  assert.equal(deriveItemTitle('note', '   '), 'Untitled');
});

test('deriveItemTitle extracts domain from URL', () => {
  assert.equal(deriveItemTitle('url', 'https://example.com'), 'example.com');
  assert.equal(deriveItemTitle('url', 'http://github.com/user/repo'), 'github.com');
});

test('deriveItemTitle returns link fallback for URL without domain', () => {
  assert.equal(deriveItemTitle('url', 'https://'), 'Link');
});

test('deriveItemTitle truncates note content to 20 chars', () => {
  assert.equal(deriveItemTitle('note', 'Short note'), 'Short note');
  assert.equal(deriveItemTitle('note', 'This is a very long note content'), 'This is a very long ...');
});

test('deriveItemTitle extracts filename from path', () => {
  assert.equal(deriveItemTitle('file', 'C:\\Users\\doc\\file.pdf'), 'file.pdf');
  assert.equal(deriveItemTitle('folder', '/home/user/projects/myapp'), 'myapp');
  assert.equal(deriveItemTitle('file', 'document.txt'), 'document.txt');
});

test('deriveItemTitle handles UNC paths correctly', () => {
  assert.equal(deriveItemTitle('folder', '\\\\server\\share\\folder'), 'folder');
});

test('deriveItemTitle trims whitespace from content', () => {
  assert.equal(deriveItemTitle('note', '  Trimmed content  '), 'Trimmed content');
});
