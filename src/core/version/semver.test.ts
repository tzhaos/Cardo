import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  compareProductSemver,
  isNewerProductSemver,
  isProductSemver,
  normalizeProductSemver,
} from './semver';

describe('product semver', () => {
  it('accepts X.Y.Z only', () => {
    assert.equal(isProductSemver('0.1.0'), true);
    assert.equal(isProductSemver('1.2.3'), true);
    assert.equal(isProductSemver('v0.1.0'), false);
    assert.equal(isProductSemver('0.1.0-beta'), false);
    assert.equal(isProductSemver('01.0.0'), true);
  });

  it('normalizes optional v prefix', () => {
    assert.equal(normalizeProductSemver('v0.1.0'), '0.1.0');
    assert.equal(normalizeProductSemver('0.1.0'), '0.1.0');
    assert.equal(normalizeProductSemver('0.1'), null);
  });

  it('compares versions', () => {
    assert.equal(compareProductSemver('0.1.0', '0.1.0'), 0);
    assert.ok((compareProductSemver('0.1.1', '0.1.0') ?? 0) > 0);
    assert.ok((compareProductSemver('0.2.0', '1.0.0') ?? 0) < 0);
    assert.equal(isNewerProductSemver('0.2.0', '0.1.0'), true);
    assert.equal(isNewerProductSemver('0.1.0', '0.1.0'), false);
    assert.equal(isNewerProductSemver('0.0.9', '0.1.0'), false);
  });
});
