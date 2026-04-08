import type { StateStorage } from 'zustand/middleware';

/** Port for persistent key-value storage backing Zustand stores (chrome.storage.local in production). */
export type WorkspaceStoragePort = StateStorage;
