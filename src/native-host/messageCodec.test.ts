import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeNativeMessage, tryDecodeNativeMessage } from './messageCodec';

test('native message codec round-trips length-prefixed JSON', () => {
  const encoded = encodeNativeMessage({ ok: true });
  const decoded = tryDecodeNativeMessage(encoded);

  assert.deepEqual(decoded.message, { ok: true });
  assert.equal(decoded.remaining.byteLength, 0);
});

test('native message codec waits for complete frames', () => {
  const encoded = encodeNativeMessage({ ok: true });
  const decoded = tryDecodeNativeMessage(encoded.subarray(0, 5));

  assert.equal(decoded.message, null);
  assert.equal(decoded.remaining.byteLength, 5);
});
