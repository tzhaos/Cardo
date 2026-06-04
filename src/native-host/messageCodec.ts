const HEADER_SIZE = 4;

export function encodeNativeMessage(message: unknown) {
  const body = Buffer.from(JSON.stringify(message), 'utf8');
  const header = Buffer.alloc(HEADER_SIZE);
  header.writeUInt32LE(body.byteLength, 0);

  return Buffer.concat([header, body]);
}

export function tryDecodeNativeMessage(buffer: Buffer) {
  if (buffer.byteLength < HEADER_SIZE) {
    return { message: null, remaining: buffer };
  }

  const bodyLength = buffer.readUInt32LE(0);
  const frameLength = HEADER_SIZE + bodyLength;

  if (buffer.byteLength < frameLength) {
    return { message: null, remaining: buffer };
  }

  const body = buffer.subarray(HEADER_SIZE, frameLength).toString('utf8');
  const remaining = buffer.subarray(frameLength);

  return {
    message: JSON.parse(body) as unknown,
    remaining,
  };
}
