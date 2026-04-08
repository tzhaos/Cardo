import assert from 'node:assert/strict';
import test from 'node:test';
import { readClipboardItem } from './readClipboardItem';
import { clipboardPort } from '../ports/defaultPorts';

test('readClipboardItem parses URL text from clipboard', async (t) => {
  t.mock.method(clipboardPort, 'readText', async () => 'https://example.com');
  const result = await readClipboardItem();

  assert.ok(result);
  assert.equal(result.type, 'url');
  assert.equal(result.content, 'https://example.com');
});

test('readClipboardItem parses plain text as note', async (t) => {
  t.mock.method(clipboardPort, 'readText', async () => 'hello world');
  const result = await readClipboardItem();

  assert.ok(result);
  assert.equal(result.type, 'note');
});

test('readClipboardItem returns null for empty clipboard', async (t) => {
  t.mock.method(clipboardPort, 'readText', async () => '');
  const result = await readClipboardItem();

  assert.equal(result, null);
});

test('readClipboardItem returns null when clipboard access fails', async (t) => {
  t.mock.method(clipboardPort, 'readText', async () => {
    throw new Error('Permission denied');
  });
  const result = await readClipboardItem();

  assert.equal(result, null);
});
