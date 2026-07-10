import assert from 'node:assert/strict';
import test from 'node:test';
import { createPasteItemDraft } from './paste';

test('creates folder items from local paths', () => {
  assert.deepEqual(createPasteItemDraft('C:\\Workspace\\KhaosBox'), {
    type: 'folder',
    draft: {
      title: 'KhaosBox',
      path: 'C:\\Workspace\\KhaosBox',
      kind: 'folder',
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

test('rejects empty and unsupported path-like input', () => {
  assert.equal(createPasteItemDraft(''), null);
  assert.equal(createPasteItemDraft('C:\\Workspace\\notes.txt'), null);
});
