import { log } from '../../core/log';
import type { LocalResourcePort } from '../../core/ports/LocalResourcePort';
import { createKbeUrl } from '../../core/protocols/kbeUrl';

export const kbeLocalResourcePort: LocalResourcePort = {
  requestOpen(resourcePath) {
    try {
      window.open(createKbeUrl(resourcePath), '_blank');
      return { status: 'requested' };
    } catch (error) {
      log.warn('Failed to request local resource open', resourcePath, error);
      return {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unexpected error',
      };
    }
  },
};
