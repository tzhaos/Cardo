import type {
  DesktopLocalResourceResponse,
  DesktopRuntimeConfig,
  DesktopUpdateInstallResult,
  DesktopUpdateState,
  UpdateProxySettings,
} from '../core/contracts/desktopIpc';

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
  /** Native file/folder picker; null when canceled. */
  openLocalPathPicker(options?: { directory?: boolean }): Promise<string | null>;
  saveJson(filename: string, payload: string): Promise<void>;
  saveText(filename: string, payload: string): Promise<void>;
  resolveWebsiteIcon(url: string): Promise<string | null>;
  /** Desktop GitHub Release updater (packaged builds only). */
  getUpdateState(): Promise<DesktopUpdateState>;
  checkForUpdates(): Promise<DesktopUpdateState>;
  downloadUpdate(): Promise<DesktopUpdateState>;
  cancelUpdateDownload(): Promise<DesktopUpdateState>;
  installUpdate(): Promise<DesktopUpdateInstallResult>;
  openUpdateReleasePage(): Promise<void>;
  onUpdateStateChange(callback: (state: DesktopUpdateState) => void): () => void;
  getUpdateProxySettings(): Promise<UpdateProxySettings>;
  setUpdateProxySettings(settings: UpdateProxySettings): Promise<UpdateProxySettings>;
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
