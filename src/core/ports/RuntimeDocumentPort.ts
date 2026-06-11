import type { AppTheme } from '../domains/preferences/model/preferences';

export type RuntimeDocumentEventType = 'keydown' | 'keyup' | 'paste' | 'resize';
export type RuntimeDocumentEventListener = (event: unknown) => void;

/** Port for DOM/window interactions: title, theme, event listeners, viewport. */
export interface RuntimeDocumentPort {
  setDocumentTitle(title: string): void;
  setTheme(theme: AppTheme): void;
  addWindowListener(type: RuntimeDocumentEventType, listener: RuntimeDocumentEventListener): void;
  removeWindowListener(
    type: RuntimeDocumentEventType,
    listener: RuntimeDocumentEventListener,
  ): void;
  getViewport(): { width: number; height: number };
}
