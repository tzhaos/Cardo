import { createJSONStorage } from 'zustand/middleware';
import { extensionStateStorage } from '../browser-extension/storage/stateStorage';
import { isExtensionRuntime } from '../runtime/environment';
import { webStateStorage } from '../web/storage/stateStorage';

export function createPlatformJSONStorage<T>() {
  return createJSONStorage<T>(() => (isExtensionRuntime() ? extensionStateStorage : webStateStorage));
}
