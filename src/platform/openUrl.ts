import { openUrlInExtension } from './browser-extension/navigation/openUrl';
import { isExtensionRuntime } from './runtime/environment';
import { openUrlOnWeb } from './web/navigation/openUrl';

export function openUrl(url: string) {
  if (isExtensionRuntime()) {
    openUrlInExtension(url);
    return;
  }

  openUrlOnWeb(url);
}
