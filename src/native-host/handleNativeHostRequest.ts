import type { NativeHostRequest, NativeHostResponse } from '../core/protocols/nativeMessaging';
import { writeNativeHostDiagnostic } from './diagnostics';
import { openLocalResource } from './openLocalResource';

function isNativeHostRequest(value: unknown): value is NativeHostRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const request = value as { type?: unknown; resourcePath?: unknown };

  return request.type === 'open-local-resource' && typeof request.resourcePath === 'string';
}

export function handleNativeHostRequest(message: unknown): NativeHostResponse {
  if (!isNativeHostRequest(message)) {
    writeNativeHostDiagnostic('unsupported-request');
    return {
      ok: false,
      errorMessage: 'Unsupported native host request.',
    };
  }

  writeNativeHostDiagnostic(`request ${message.type}`);
  return openLocalResource(message.resourcePath);
}
