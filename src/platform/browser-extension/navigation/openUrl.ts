import { getChromeLikeRuntime } from '../../runtime/environment';

export function openUrlInExtension(url: string) {
  const chromeLike = getChromeLikeRuntime();

  if (chromeLike?.tabs?.create) {
    chromeLike.tabs.create({ url });
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
