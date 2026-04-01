import { createKbeUrl } from './createKbeUrl';

export function openKbeResource(resourcePath: string) {
  window.open(createKbeUrl(resourcePath), '_blank');
}
