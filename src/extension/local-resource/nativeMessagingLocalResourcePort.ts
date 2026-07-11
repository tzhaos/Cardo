import type { LocalResourcePort } from '../../core/ports/LocalResourcePort';
import { sendNativeMessage } from '../runtime/sendNativeMessage';

/**
 * Transitional NM open-local-resource (design §6.4.1).
 * Preferred path in Runtime mode is HTTP capability via hostPlatform;
 * this remains as non-DB fallback when local mode or Runtime open fails over.
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
