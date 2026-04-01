import { createKbeUrl } from './createKbeUrl';

export type LocalResourceRequestResult =
  | { status: 'requested' }
  | { status: 'failed'; errorMessage: string };

export function requestOpenLocalResource(resourcePath: string): LocalResourceRequestResult {
  try {
    window.open(createKbeUrl(resourcePath), '_blank');
    return { status: 'requested' };
  } catch (error) {
    return {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unexpected error',
    };
  }
}
