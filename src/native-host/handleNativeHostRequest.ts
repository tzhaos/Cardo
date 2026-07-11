import {
  nativeHostRequestSchema,
  nativeHostResponseSchema,
  type NativeHostResponse,
} from '../core/protocols/nativeMessaging';
import { writeNativeHostDiagnostic } from './diagnostics';
import { openLocalResource } from './openLocalResource';

export function handleNativeHostRequest(message: unknown): NativeHostResponse {
  const request = nativeHostRequestSchema.safeParse(message);
  if (!request.success) {
    writeNativeHostDiagnostic('unsupported-request');
    return nativeHostResponseSchema.parse({
      ok: false,
      errorMessage: 'Unsupported native host request.',
    });
  }

  writeNativeHostDiagnostic(`request ${request.data.type}`);
  return nativeHostResponseSchema.parse(openLocalResource(request.data.resourcePath));
}
