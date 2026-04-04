import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkspaceItem } from './item';

test('createWorkspaceItem creates item with provided title', () => {
  const item = createWorkspaceItem('item-1', {
    type: 'note',
    content: 'Content here',
    title: 'My Note',
  });

  assert.equal(item.id, 'item-1');
  assert.equal(item.type, 'note');
  assert.equal(item.title, 'My Note');
  assert.equal(item.content, 'Content here');
  assert.equal(item.isPinned, false);
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

  assert.equal(item.content, 'Trimmed content');
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

test('createWorkspaceItem respects isPinned flag', () => {
  const pinned = createWorkspaceItem('item-6', {
    type: 'file',
    content: '/path/to/file.pdf',
    isPinned: true,
  });

  assert.equal(pinned.isPinned, true);
});

test('createWorkspaceItem defaults isPinned to false', () => {
  const item = createWorkspaceItem('item-7', {
    type: 'note',
    content: 'Not pinned',
  });

  assert.equal(item.isPinned, false);
});
