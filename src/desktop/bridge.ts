export interface DesktopBridge {
  storageGet(name: string): Promise<string | null>;
  storageSet(name: string, value: string): Promise<void>;
  storageRemove(name: string): Promise<void>;
  readClipboardText(): Promise<string>;
  writeClipboardText(text: string): Promise<void>;
  openExternal(url: string): Promise<void>;
  openLocalResource(resourcePath: string): Promise<{ ok: true } | { ok: false; error: string }>;
  saveJson(filename: string, payload: string): Promise<void>;
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
