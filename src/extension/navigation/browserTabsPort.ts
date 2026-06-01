import type { TabsPort } from '../../core/ports/TabsPort';
import { log } from '../../core/log';
import { getChromeLikeRuntime } from '../runtime/chrome';

export const browserTabsPort: TabsPort = {
  openUrl(url) {
    const chromeLike = getChromeLikeRuntime();

    if (!chromeLike?.tabs?.create) {
      throw new Error('Chrome tabs API is unavailable in the extension runtime.');
    }

    Promise.resolve(chromeLike.tabs.create({ url })).catch((error) => {
      log.error('Failed to open tab', error);
    });
  },
};
