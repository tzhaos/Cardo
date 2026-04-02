import type { LocalResourcePort } from '../../app/ports/LocalResourcePort';
import { createKbeUrl } from './createKbeUrl';

export const companionLocalResourcePort: LocalResourcePort = {
  requestOpen(resourcePath) {
    try {
      window.open(createKbeUrl(resourcePath), '_blank');
      return { status: 'requested' };
    } catch (error) {
      return {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unexpected error',
      };
    }
  },
};
