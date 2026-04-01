import { getChromeLikeRuntime } from '../runtime/chrome';

export function openExtensionUrl(url: string) {
  const chromeLike = getChromeLikeRuntime();

  if (chromeLike?.tabs?.create) {
    chromeLike.tabs.create({ url });
    return;
  }

  throw new Error('Chrome tabs API is unavailable in the extension runtime.');
}
