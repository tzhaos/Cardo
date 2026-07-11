import type { LocalResourcePort } from '../../core/ports/LocalResourcePort';
import { sendNativeMessage } from '../runtime/sendNativeMessage';

/**
 * Extension shell LocalResourcePort via Native Messaging (design §6.4.1).
 * UI open path prefers Runtime HTTP capability (hostPlatform.openLocalResource);
 * this port remains for direct AppPorts shell opens when needed.
 */
export const nativeMessagingLocalResourcePort: LocalResourcePort = {
  async requestOpen(resourcePath) {
    try {
      const response = await sendNativeMessage({
        type: 'open-local-resource',
        resourcePath,
      });

      return response.ok
        ? { status: 'requested' }
        : { status: 'failed', errorMessage: response.errorMessage };
    } catch (error) {
      return {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Native host request failed.',
      };
    }
  },
};
