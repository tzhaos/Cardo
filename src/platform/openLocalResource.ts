import { openLocalResourceInExtension } from './browser-extension/native-bridge/openLocalResource';
import { isExtensionRuntime } from './runtime/environment';
import { openLocalResourceOnWeb } from './web/native-bridge/openLocalResource';

export function openLocalResource(resourcePath: string) {
  if (isExtensionRuntime()) {
    openLocalResourceInExtension(resourcePath);
    return;
  }

  openLocalResourceOnWeb(resourcePath);
}
