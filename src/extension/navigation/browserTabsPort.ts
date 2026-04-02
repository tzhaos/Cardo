import type { TabsPort } from '../../app/ports/TabsPort';
import { getChromeLikeRuntime } from '../runtime/chrome';

export const browserTabsPort: TabsPort = {
  openUrl(url) {
    const chromeLike = getChromeLikeRuntime();

    if (!chromeLike?.tabs?.create) {
      throw new Error('Chrome tabs API is unavailable in the extension runtime.');
    }

    chromeLike.tabs.create({ url });
  },
};
