import assert from 'node:assert/strict';
import test from 'node:test';
import { createKbeUrl } from './createKbeUrl';
import { CREATE_KBE_URL_CASES } from './kbeUrl.fixtures';

for (const { path: inputPath, url: expected } of CREATE_KBE_URL_CASES) {
  test(`createKbeUrl encodes (${expected.slice(0, 24)}…)`, () => {
    assert.equal(createKbeUrl(inputPath), expected);
  });
}
