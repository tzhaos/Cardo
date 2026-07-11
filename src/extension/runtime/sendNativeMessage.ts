import {
  KHAOSBOX_NATIVE_HOST_NAME,
  nativeHostRequestSchema,
  nativeHostResponseSchema,
  type NativeHostRequest,
  type NativeHostResponse,
} from '../../core/protocols/nativeMessaging';
import { getChromeRuntimeApi } from './chrome';

/**
 * Send a Zod-validated request to the thin native messaging host.
 * Used for runtime.discover and transitional open-local-resource.
 */
export function sendNativeMessage(message: NativeHostRequest): Promise<NativeHostResponse> {
  const runtime = getChromeRuntimeApi();

  if (!runtime?.sendNativeMessage) {
    return Promise.reject(new Error('Chrome native messaging API is unavailable.'));
  }

  const request = nativeHostRequestSchema.parse(message);

  return new Promise<NativeHostResponse>((resolve, reject) => {
    try {
      const maybePromise = runtime.sendNativeMessage?.(
        KHAOSBOX_NATIVE_HOST_NAME,
        request,
        (response) => {
          const lastErrorMessage = runtime.lastError?.message;

          if (lastErrorMessage) {
            reject(new Error(lastErrorMessage));
            return;
          }

          const parsed = nativeHostResponseSchema.safeParse(response);
          if (!parsed.success) {
            reject(new Error('Native host returned an invalid response.'));
            return;
          }

          resolve(parsed.data);
        },
      );

      if (maybePromise && typeof maybePromise === 'object' && 'then' in maybePromise) {
        Promise.resolve(maybePromise)
          .then((response) => {
            const parsed = nativeHostResponseSchema.safeParse(response);
            if (!parsed.success) {
              reject(new Error('Native host returned an invalid response.'));
              return;
            }
            resolve(parsed.data);
          })
          .catch(reject);
      }
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
