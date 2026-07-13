const HEADER_SIZE = 4;

/** Max NM stdin frame body length (aligned with HTTP JSON body cap). */
export const MAX_NATIVE_MESSAGE_BYTES = 2 * 1024 * 1024;

export class NativeMessageTooLargeError extends Error {
  readonly code = 'native_message_too_large' as const;
  readonly bodyLength: number;

  constructor(bodyLength: number) {
    super(
      `Native message body length ${bodyLength} exceeds limit of ${MAX_NATIVE_MESSAGE_BYTES} bytes.`,
    );
    this.name = 'NativeMessageTooLargeError';
    this.bodyLength = bodyLength;
  }
}

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
  // Reject as soon as the length prefix is known — do not wait for / allocate the body.
  if (bodyLength > MAX_NATIVE_MESSAGE_BYTES) {
    throw new NativeMessageTooLargeError(bodyLength);
  }

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
