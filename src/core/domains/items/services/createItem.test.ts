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
  const parsed = parseLocalPathText('\\\\server\\share');

  assert.deepEqual(parsed, {
    normalizedPath: '\\\\server\\share',
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
  assert.equal(item.path, 'V:\\Temp\\ZhihaoTian');
  assert.equal(item.title, 'ZhihaoTian');
});

test('parseTextToItemDraft turns pasted UNC paths into folder drafts', () => {
  const item = createWorkspaceItem('item-unc', parseTextToItemDraft('\\\\server\\share'));

  assert.equal(item.type, 'folder');
  assert.equal(item.path, '\\\\server\\share');
  assert.equal(item.title, 'share');
});

test('parseTextToItemDraft preserves Chinese folder paths', () => {
  const item = createWorkspaceItem('item-cn', parseTextToItemDraft('V:\\共享目录\\中文 文件夹'));

  assert.equal(item.type, 'folder');
  assert.equal(item.path, 'V:\\共享目录\\中文 文件夹');
  assert.equal(item.title, '中文 文件夹');
});

test('parseTextToItemDraft treats dotted version folders as folders', () => {
  const item = createWorkspaceItem(
    'item-version-folder',
    parseTextToItemDraft('F:\\Tools\\pcnt_tools_v2.2.0'),
  );

  assert.equal(item.type, 'folder');
  assert.equal(item.path, 'F:\\Tools\\pcnt_tools_v2.2.0');
  assert.equal(item.title, 'pcnt_tools_v2.2.0');
});

test('parseTextToItemDraft turns executable paths into shortcut drafts', () => {
  const item = createWorkspaceItem('item-shortcut', parseTextToItemDraft('C:\\Tools\\app.exe'));

  assert.equal(item.type, 'shortcut');
  assert.equal(item.path, 'C:\\Tools\\app.exe');
  assert.equal(item.title, 'app.exe');
});

test('parseLocalPathText recognizes lnk shortcuts', () => {
  const parsed = parseLocalPathText('C:\\Users\\Public\\Desktop\\App.lnk');

  assert.deepEqual(parsed, {
    normalizedPath: 'C:\\Users\\Public\\Desktop\\App.lnk',
    type: 'shortcut',
  });
});
