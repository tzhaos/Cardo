import type { DesktopLocalResourceResponse, DesktopRuntimeConfig } from '../core/contracts/desktopIpc';

export interface DesktopBridge {
  minimizeWindow(): Promise<void>;
  toggleMaximizeWindow(): Promise<boolean>;
  closeWindow(): Promise<void>;
  isWindowMaximized(): Promise<boolean>;
  onWindowMaximizedChange(callback: (isMaximized: boolean) => void): () => void;
  /** RuntimeClient config (also injected as window.__CARDO_RUNTIME__). */
  getRuntimeConfig(): DesktopRuntimeConfig | null;
  readClipboardText(): Promise<string>;
  writeClipboardText(text: string): Promise<void>;
  openExternal(url: string): Promise<void>;
  openLocalResource(resourcePath: string): Promise<DesktopLocalResourceResponse>;
  saveJson(filename: string, payload: string): Promise<void>;
  saveText(filename: string, payload: string): Promise<void>;
  resolveWebsiteIcon(url: string): Promise<string | null>;
}

declare global {
  interface Window {
    cardoDesktop?: DesktopBridge;
  }
}

export function getDesktopBridge() {
  if (!window.cardoDesktop) {
    throw new Error('Cardo desktop bridge is unavailable.');
  }

  return window.cardoDesktop;
}
