import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeProxyUrl, readEnvProxyUrl } from './proxyUrl';

describe('normalizeProxyUrl', () => {
  it('parses host:port', () => {
    assert.equal(normalizeProxyUrl('127.0.0.1:7890'), 'http://127.0.0.1:7890');
  });

  it('parses full http URL', () => {
    assert.equal(normalizeProxyUrl('http://127.0.0.1:7890'), 'http://127.0.0.1:7890');
  });

  it('rejects invalid', () => {
    assert.equal(normalizeProxyUrl(''), null);
    assert.equal(normalizeProxyUrl('not-a-proxy'), null);
  });
});

describe('readEnvProxyUrl', () => {
  it('reads HTTPS_PROXY', () => {
    assert.equal(
      readEnvProxyUrl({ HTTPS_PROXY: 'http://127.0.0.1:7890' } as NodeJS.ProcessEnv),
      'http://127.0.0.1:7890',
    );
  });
});
