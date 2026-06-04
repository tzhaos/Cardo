#!/usr/bin/env node
import { handleNativeHostRequest } from './handleNativeHostRequest';
import { encodeNativeMessage, tryDecodeNativeMessage } from './messageCodec';
import { writeNativeHostDiagnostic } from './diagnostics';

function writeResponse(response: unknown) {
  process.stdout.write(encodeNativeMessage(response));
}

let pending = Buffer.alloc(0);

writeNativeHostDiagnostic('started');

process.stdin.on('data', (chunk: Buffer) => {
  pending = Buffer.concat([pending, chunk]);

  while (pending.byteLength > 0) {
    try {
      const decoded = tryDecodeNativeMessage(pending);

      if (!decoded.message) {
        return;
      }

      pending = decoded.remaining;
      writeResponse(handleNativeHostRequest(decoded.message));
    } catch (error) {
      writeNativeHostDiagnostic(
        `invalid-message ${error instanceof Error ? error.message : 'unknown-error'}`,
      );
      writeResponse({
        ok: false,
        errorMessage: error instanceof Error ? error.message : 'Invalid native host message.',
      });
      pending = Buffer.alloc(0);
    }
  }
});

process.stdin.on('end', () => {
  writeNativeHostDiagnostic('stdin-ended');
  process.exit(0);
});
