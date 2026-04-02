import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkspaceItem } from '../model/item';
import { parseLocalPathText } from './parseLocalPathText';
import { parseTextToItemDraft } from './parseTextToItemDraft';

test('parseLocalPathText recognizes drive-letter folder paths', () => {
  const parsed = parseLocalPathText('V:\\Temp\\ZhihaoTian');

  assert.deepEqual(parsed, {
    normalizedPath: 'V:\\Temp\\ZhihaoTian',
    type: 'folder',
  });
});

test('parseLocalPathText recognizes UNC folder paths', () => {
  const parsed = parseLocalPathText('\\\\shfile01.lisuantech.com\\SW');

  assert.deepEqual(parsed, {
    normalizedPath: '\\\\shfile01.lisuantech.com\\SW',
    type: 'folder',
  });
});

test('parseLocalPathText converts file URIs to Windows paths', () => {
  const parsed = parseLocalPathText('file:///V:/Temp/ZhihaoTian');

  assert.deepEqual(parsed, {
    normalizedPath: 'V:\\Temp\\ZhihaoTian',
    type: 'folder',
  });
});

test('parseTextToItemDraft turns pasted drive paths into folder drafts', () => {
  const item = createWorkspaceItem('item-drive', parseTextToItemDraft('V:\\Temp\\ZhihaoTian'));

  assert.equal(item.type, 'folder');
  assert.equal(item.content, 'V:\\Temp\\ZhihaoTian');
  assert.equal(item.title, 'ZhihaoTian');
});

test('parseTextToItemDraft turns pasted UNC paths into folder drafts', () => {
  const item = createWorkspaceItem('item-unc', parseTextToItemDraft('\\\\shfile01.lisuantech.com\\SW'));

  assert.equal(item.type, 'folder');
  assert.equal(item.content, '\\\\shfile01.lisuantech.com\\SW');
  assert.equal(item.title, 'SW');
});

test('parseTextToItemDraft preserves Chinese folder paths', () => {
  const item = createWorkspaceItem('item-cn', parseTextToItemDraft('V:\\共享目录\\中文 文件夹'));

  assert.equal(item.type, 'folder');
  assert.equal(item.content, 'V:\\共享目录\\中文 文件夹');
  assert.equal(item.title, '中文 文件夹');
});
