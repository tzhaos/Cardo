import type {
  DatabaseExecuteRequest,
  DatabaseExecuteResponse,
} from '../core/contracts/database';

export interface DesktopBridge {
  minimizeWindow(): Promise<void>;
  toggleMaximizeWindow(): Promise<boolean>;
  closeWindow(): Promise<void>;
  isWindowMaximized(): Promise<boolean>;
  onWindowMaximizedChange(callback: (isMaximized: boolean) => void): () => void;
  storageGet(name: string): Promise<string | null>;
  storageSet(name: string, value: string): Promise<void>;
  storageRemove(name: string): Promise<void>;
  databaseExecute(request: DatabaseExecuteRequest): Promise<DatabaseExecuteResponse>;
  readClipboardText(): Promise<string>;
  writeClipboardText(text: string): Promise<void>;
  openExternal(url: string): Promise<void>;
  openLocalResource(resourcePath: string): Promise<{ ok: true } | { ok: false; error: string }>;
  saveJson(filename: string, payload: string): Promise<void>;
  saveText(filename: string, payload: string): Promise<void>;
  resolveWebsiteIcon(url: string): Promise<string | null>;
}

declare global {
  interface Window {
    khaosboxDesktop?: DesktopBridge;
  }
}

export function getDesktopBridge() {
  if (!window.khaosboxDesktop) {
    throw new Error('KhaosBox desktop bridge is unavailable.');
  }

  return window.khaosboxDesktop;
}
