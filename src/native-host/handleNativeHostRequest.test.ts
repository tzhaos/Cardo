import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeLocalResourcePath, validateLocalResourcePath } from './openLocalResource';
import { handleNativeHostRequest } from './handleNativeHostRequest';

test('native host rejects unsupported requests', async () => {
  assert.deepEqual(await handleNativeHostRequest({ type: 'unknown' }), {
    ok: false,
    errorMessage: 'Unsupported native host request.',
  });
});

test('native host path validation rejects empty and null-byte paths', () => {
  assert.equal(validateLocalResourcePath(''), 'Resource path is empty.');
  assert.equal(
    validateLocalResourcePath('C:\\A\0B'),
    'Resource path contains an invalid character.',
  );
  assert.equal(validateLocalResourcePath('C:\\A'), null);
});

test('native host normalizes Windows file URLs', () => {
  assert.deepEqual(normalizeLocalResourcePath('file:///F:/Workspace/sw_driver'), {
    ok: true,
    path: 'F:\\Workspace\\sw_driver',
  });
});
