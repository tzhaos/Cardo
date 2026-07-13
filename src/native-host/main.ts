#!/usr/bin/env node
import { handleNativeHostRequest } from './handleNativeHostRequest';
import {
  encodeNativeMessage,
  NativeMessageTooLargeError,
  tryDecodeNativeMessage,
} from './messageCodec';
import { writeNativeHostDiagnostic } from './diagnostics';

function writeResponse(response: unknown) {
  process.stdout.write(encodeNativeMessage(response));
}

let pending = Buffer.alloc(0);
/** Serialize async handlers so responses stay ordered. */
let handleChain: Promise<void> = Promise.resolve();
/** Avoid flooding diagnostics if stdin keeps advertising oversize frames. */
let loggedMessageTooLarge = false;

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
      const message = decoded.message;
      handleChain = handleChain
        .then(async () => {
          const response = await handleNativeHostRequest(message);
          writeResponse(response);
        })
        .catch((error: unknown) => {
          writeNativeHostDiagnostic(
            `handler-error ${error instanceof Error ? error.message : 'unknown-error'}`,
          );
          writeResponse({
            ok: false,
            errorMessage: error instanceof Error ? error.message : 'Native host handler failed.',
          });
        });
    } catch (error) {
      if (error instanceof NativeMessageTooLargeError) {
        if (!loggedMessageTooLarge) {
          loggedMessageTooLarge = true;
          writeNativeHostDiagnostic(
            `message-too-large bodyLength=${error.bodyLength} code=${error.code}`,
          );
        }
        writeResponse({
          ok: false,
          errorMessage: error.message,
        });
      } else {
        writeNativeHostDiagnostic(
          `invalid-message ${error instanceof Error ? error.message : 'unknown-error'}`,
        );
        writeResponse({
          ok: false,
          errorMessage: error instanceof Error ? error.message : 'Invalid native host message.',
        });
      }
      pending = Buffer.alloc(0);
    }
  }
});

process.stdin.on('end', () => {
  writeNativeHostDiagnostic('stdin-ended');
  void handleChain.finally(() => {
    process.exit(0);
  });
});
