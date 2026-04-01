import assert from 'node:assert/strict';
import test from 'node:test';
import { createKbeUrl } from './createKbeUrl';

test('createKbeUrl encodes Chinese drive-letter paths', () => {
  assert.equal(
    createKbeUrl('V:\\\u5171\u4eab\u76ee\u5f55\\\u4e2d\u6587 \u6587\u4ef6\u5939'),
    'kbe:V:/%E5%85%B1%E4%BA%AB%E7%9B%AE%E5%BD%95/%E4%B8%AD%E6%96%87%20%E6%96%87%E4%BB%B6%E5%A4%B9',
  );
});

test('createKbeUrl encodes Chinese UNC paths', () => {
  assert.equal(
    createKbeUrl('\\\\server\\\u5171\u4eab\\\u4e2d\u6587\u76ee\u5f55'),
    'kbe://server/%E5%85%B1%E4%BA%AB/%E4%B8%AD%E6%96%87%E7%9B%AE%E5%BD%95',
  );
});

test('createKbeUrl preserves nested file URIs for parser normalization', () => {
  assert.equal(
    createKbeUrl('file:///C:/Work/Specs.pdf'),
    'kbe:file:///C:/Work/Specs.pdf',
  );
});
