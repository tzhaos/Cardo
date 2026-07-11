import assert from 'node:assert/strict';
import test from 'node:test';
import { createPasteItemDraft } from './paste';

test('creates folder items from local paths', () => {
  assert.deepEqual(createPasteItemDraft('C:\\Workspace\\MyProject'), {
    type: 'folder',
    draft: {
      title: 'MyProject',
      path: 'C:\\Workspace\\MyProject',
    },
  });
});

test('creates bookmark items from URLs', () => {
  assert.deepEqual(createPasteItemDraft('https://www.openai.com/docs'), {
    type: 'bookmark',
    draft: {
      title: 'openai',
      url: 'https://www.openai.com/docs',
    },
  });
});

test('creates clipboard items from plain text', () => {
  assert.deepEqual(createPasteItemDraft('Reusable clipboard text'), {
    type: 'clipboard',
    draft: {
      title: '',
      text: 'Reusable clipboard text',
    },
  });
});

test('creates file and shortcut items from recognized local paths', () => {
  assert.equal(createPasteItemDraft('C:\\Workspace\\notes.txt')?.type, 'file');
  assert.equal(createPasteItemDraft('C:\\Tools\\editor.exe')?.type, 'shortcut');
});

test('rejects empty input', () => {
  assert.equal(createPasteItemDraft(''), null);
});
