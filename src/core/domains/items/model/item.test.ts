import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkspaceItem, getWorkspaceItemContent } from './item';

test('createWorkspaceItem creates item with provided title', () => {
  const item = createWorkspaceItem('item-1', {
    type: 'note',
    content: 'Content here',
    title: 'My Note',
  });

  assert.equal(item.id, 'item-1');
  assert.equal(item.type, 'note');
  assert.equal(item.title, 'My Note');
  assert.equal(item.text, 'Content here');
});

test('createWorkspaceItem derives title from content when not provided', () => {
  const item = createWorkspaceItem('item-2', {
    type: 'url',
    content: 'https://github.com/user/repo',
  });

  assert.equal(item.title, 'github.com');
});

test('createWorkspaceItem trims content whitespace', () => {
  const item = createWorkspaceItem('item-3', {
    type: 'note',
    content: '  Trimmed content  ',
    title: 'Title',
  });

  assert.equal(getWorkspaceItemContent(item), 'Trimmed content');
});

test('createWorkspaceItem trims title whitespace', () => {
  const item = createWorkspaceItem('item-4', {
    type: 'note',
    content: 'Content',
    title: '  Trimmed Title  ',
  });

  assert.equal(item.title, 'Trimmed Title');
});

test('createWorkspaceItem falls back to derived title when title is empty', () => {
  const item = createWorkspaceItem('item-5', {
    type: 'folder',
    content: 'C:\\Projects\\MyProject',
    title: '   ',
  });

  assert.equal(item.title, 'MyProject');
});

test('createWorkspaceItem stores type-specific content fields', () => {
  const urlItem = createWorkspaceItem('item-6', {
    type: 'url',
    content: 'https://example.com',
  });
  const fileItem = createWorkspaceItem('item-7', {
    type: 'file',
    content: '/path/to/file.pdf',
  });

  assert.equal(urlItem.type, 'url');
  assert.equal(urlItem.url, 'https://example.com');
  assert.equal(fileItem.type, 'file');
  assert.equal(fileItem.path, '/path/to/file.pdf');
});
