import { createJSONStorage } from 'zustand/middleware';
import { extensionStateStorage } from './stateStorage';

export function createExtensionJSONStorage<T>() {
  return createJSONStorage<T>(() => extensionStateStorage);
}
