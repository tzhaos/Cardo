import {
  KHAOSBOX_NATIVE_HOST_NAME,
  nativeHostRequestSchema,
  nativeHostResponseSchema,
  type NativeHostRequest,
} from '../../core/protocols/nativeMessaging';
import type { LocalResourcePort } from '../../core/ports/LocalResourcePort';
import { getChromeRuntimeApi } from '../runtime/chrome';

function sendNativeMessage(message: NativeHostRequest) {
  const runtime = getChromeRuntimeApi();

  if (!runtime?.sendNativeMessage) {
    return Promise.reject(new Error('Chrome native messaging API is unavailable.'));
  }

  return new Promise<unknown>((resolve, reject) => {
    try {
      const maybePromise = runtime.sendNativeMessage?.(
        KHAOSBOX_NATIVE_HOST_NAME,
        nativeHostRequestSchema.parse(message),
        (response) => {
          const lastErrorMessage = runtime.lastError?.message;

          if (lastErrorMessage) {
            reject(new Error(lastErrorMessage));
            return;
          }

          resolve(response);
        },
      );

      if (maybePromise && typeof maybePromise === 'object' && 'then' in maybePromise) {
        Promise.resolve(maybePromise).then(resolve).catch(reject);
      }
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export const nativeMessagingLocalResourcePort: LocalResourcePort = {
  async requestOpen(resourcePath) {
    try {
      const response = await sendNativeMessage({
        type: 'open-local-resource',
        resourcePath,
      });

      const parsedResponse = nativeHostResponseSchema.safeParse(response);
      if (!parsedResponse.success) {
        return {
          status: 'failed',
          errorMessage: 'Native host returned an invalid response.',
        };
      }

      return parsedResponse.data.ok
        ? { status: 'requested' }
        : { status: 'failed', errorMessage: parsedResponse.data.errorMessage };
    } catch (error) {
      return {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Native host request failed.',
      };
    }
  },
};
