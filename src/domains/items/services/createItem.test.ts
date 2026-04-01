import assert from 'node:assert/strict';
import test from 'node:test';
import { createItemFromText } from './createItem';
import { parseLocalPathText } from './parseLocalPathText';

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

test('createItemFromText turns pasted drive paths into folder items', () => {
  const item = createItemFromText('V:\\Temp\\ZhihaoTian');

  assert.equal(item.type, 'folder');
  assert.equal(item.content, 'V:\\Temp\\ZhihaoTian');
  assert.equal(item.title, 'ZhihaoTian');
});

test('createItemFromText turns pasted UNC paths into folder items', () => {
  const item = createItemFromText('\\\\shfile01.lisuantech.com\\SW');

  assert.equal(item.type, 'folder');
  assert.equal(item.content, '\\\\shfile01.lisuantech.com\\SW');
  assert.equal(item.title, 'SW');
});

test('createItemFromText preserves Chinese folder paths', () => {
  const item = createItemFromText('V:\\共享目录\\中文 文件夹');

  assert.equal(item.type, 'folder');
  assert.equal(item.content, 'V:\\共享目录\\中文 文件夹');
  assert.equal(item.title, '中文 文件夹');
});
