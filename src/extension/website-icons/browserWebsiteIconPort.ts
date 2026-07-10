import type { WebsiteIconPort } from '../../core/ports/WebsiteIconPort';
import { getChromeRuntimeApi } from '../runtime/chrome';

const MAX_ICON_BYTES = 256 * 1024;

export const browserWebsiteIconPort: WebsiteIconPort = {
  async resolve(url) {
    const pageUrl = normalizeWebUrl(url);
    if (!pageUrl) return null;
    const runtimeUrl = getChromeRuntimeApi()?.getURL?.(
      `_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=32`,
    );
    if (runtimeUrl) {
      const icon = await fetchIcon(runtimeUrl);
      if (icon) return icon;
    }
    return fetchIcon(new URL('/favicon.ico', pageUrl).toString());
  },
};

async function fetchIcon(url: string) {
  try {
    const response = await fetch(url, { cache: 'force-cache', credentials: 'omit' });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.size || blob.size > MAX_ICON_BYTES) return null;
    if (blob.type && !blob.type.startsWith('image/')) return null;
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

function normalizeWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
