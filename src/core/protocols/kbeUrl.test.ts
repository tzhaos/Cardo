import assert from 'node:assert/strict';
import test from 'node:test';
import { createKbeUrl, parseKbeUrl } from './kbeUrl';
import { CREATE_KBE_URL_CASES, KBE_PARSE_CASES } from './kbeUrl.fixtures';

for (const { path: inputPath, url: expected } of CREATE_KBE_URL_CASES) {
  test(`createKbeUrl encodes ${expected.slice(0, 24)}`, () => {
    assert.equal(createKbeUrl(inputPath), expected);
  });
}

for (const { url, expectedWindowsPath } of KBE_PARSE_CASES) {
  test(`parseKbeUrl parses ${url.slice(0, 24)}`, () => {
    assert.equal(parseKbeUrl(url), expectedWindowsPath);
  });
}
