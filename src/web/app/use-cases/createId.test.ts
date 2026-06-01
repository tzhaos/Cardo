import assert from 'node:assert/strict';
import test from 'node:test';
import { createId } from './createId';

test('createId starts with the given prefix', () => {
  const id = createId('box');
  assert.ok(id.startsWith('box-'));
});

test('createId produces unique values', () => {
  const ids = new Set(Array.from({ length: 100 }, () => createId('item')));
  assert.equal(ids.size, 100);
});

test('createId contains a valid UUID after the prefix', () => {
  const id = createId('test');
  const uuid = id.slice('test-'.length);
  assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
