import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createKbeUrl } from './createKbeUrl';

interface KbeFixtureDocument {
  encodeCases: Array<{
    resourcePath: string;
    expectedUrl: string;
  }>;
}

const fixturePath = path.resolve(import.meta.dirname, '../../../contracts/kbe/fixtures.json');
const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as KbeFixtureDocument;

for (const fixture of fixtures.encodeCases) {
  test(`createKbeUrl encodes ${fixture.resourcePath}`, () => {
    assert.equal(createKbeUrl(fixture.resourcePath), fixture.expectedUrl);
  });
}
