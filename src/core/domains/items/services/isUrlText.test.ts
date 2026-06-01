import assert from 'node:assert/strict';
import test from 'node:test';
import { isUrlText } from './isUrlText';

test('isUrlText recognizes HTTP URLs', () => {
  assert.equal(isUrlText('http://example.com'), true);
  assert.equal(isUrlText('https://example.com'), true);
});

test('isUrlText is case-insensitive for scheme', () => {
  assert.equal(isUrlText('HTTP://example.com'), true);
  assert.equal(isUrlText('HTTPS://example.com'), true);
  assert.equal(isUrlText('Http://example.com'), true);
});

test('isUrlText returns false for non-URLs', () => {
  assert.equal(isUrlText('not a url'), false);
  assert.equal(isUrlText('example.com'), false);
  assert.equal(isUrlText('ftp://example.com'), false);
});

test('isUrlText trims whitespace before checking', () => {
  assert.equal(isUrlText('  https://example.com  '), true);
});

test('isUrlText returns false for empty or whitespace-only strings', () => {
  assert.equal(isUrlText(''), false);
  assert.equal(isUrlText('   '), false);
});
