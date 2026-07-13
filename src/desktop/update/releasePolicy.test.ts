import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseCardoReleasePolicy, shouldForceClientUpdate } from './releasePolicy';

describe('parseCardoReleasePolicy', () => {
  it('reads min client and force flag from release notes', () => {
    const policy = parseCardoReleasePolicy(
      '## Notes\n\nCardo-Min-Client: 0.1.3\nCardo-Force-Update: true\n',
    );
    assert.equal(policy.minClientVersion, '0.1.3');
    assert.equal(policy.forceUpdateFlag, true);
  });

  it('defaults to no force policy', () => {
    const policy = parseCardoReleasePolicy('Regular release notes.');
    assert.equal(policy.minClientVersion, null);
    assert.equal(policy.forceUpdateFlag, false);
  });
});

describe('shouldForceClientUpdate', () => {
  it('forces when below min client', () => {
    assert.equal(
      shouldForceClientUpdate({
        currentVersion: '0.1.2',
        availableVersion: '0.1.4',
        policy: { minClientVersion: '0.1.3', forceUpdateFlag: false },
      }),
      true,
    );
  });

  it('does not force when at or above min', () => {
    assert.equal(
      shouldForceClientUpdate({
        currentVersion: '0.1.3',
        availableVersion: '0.1.4',
        policy: { minClientVersion: '0.1.3', forceUpdateFlag: false },
      }),
      false,
    );
  });

  it('forces when flag is set', () => {
    assert.equal(
      shouldForceClientUpdate({
        currentVersion: '0.1.3',
        availableVersion: '0.1.4',
        policy: { minClientVersion: null, forceUpdateFlag: true },
      }),
      true,
    );
  });
});
