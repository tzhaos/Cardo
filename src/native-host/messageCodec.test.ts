import assert from 'node:assert/strict';
import test from 'node:test';
import {
  encodeNativeMessage,
  MAX_NATIVE_MESSAGE_BYTES,
  NativeMessageTooLargeError,
  tryDecodeNativeMessage,
} from './messageCodec';

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

test('rejects oversize frames from length prefix alone without body', () => {
  const oversize = MAX_NATIVE_MESSAGE_BYTES + 1;
  const header = Buffer.alloc(4);
  header.writeUInt32LE(oversize, 0);

  assert.throws(
    () => tryDecodeNativeMessage(header),
    (error: unknown) => {
      assert.ok(error instanceof NativeMessageTooLargeError);
      assert.equal(error.code, 'native_message_too_large');
      assert.equal(error.bodyLength, oversize);
      return true;
    },
  );
});

test('rejects max uint32 length without allocating a huge buffer', () => {
  const header = Buffer.alloc(4);
  header.writeUInt32LE(0xffff_ffff, 0);

  assert.throws(() => tryDecodeNativeMessage(header), NativeMessageTooLargeError);
});

test('accepts a complete frame at the max body size', () => {
  // Valid JSON string whose UTF-8 byte length is exactly MAX_NATIVE_MESSAGE_BYTES.
  const jsonBody = `"${'a'.repeat(MAX_NATIVE_MESSAGE_BYTES - 2)}"`;
  assert.equal(Buffer.byteLength(jsonBody, 'utf8'), MAX_NATIVE_MESSAGE_BYTES);

  const header = Buffer.alloc(4);
  header.writeUInt32LE(MAX_NATIVE_MESSAGE_BYTES, 0);
  const frame = Buffer.concat([header, Buffer.from(jsonBody, 'utf8')]);

  const decoded = tryDecodeNativeMessage(frame);
  assert.equal(typeof decoded.message, 'string');
  assert.equal((decoded.message as string).length, MAX_NATIVE_MESSAGE_BYTES - 2);
  assert.equal(decoded.remaining.byteLength, 0);
});
