import type { AppTheme } from '../../domains/preferences/model/preferences';

export interface RuntimeDocumentPort {
  setDocumentTitle(title: string): void;
  setTheme(theme: AppTheme): void;
  addWindowListener<K extends keyof WindowEventMap>(
    type: K,
    listener: (event: WindowEventMap[K]) => void,
  ): void;
  removeWindowListener<K extends keyof WindowEventMap>(
    type: K,
    listener: (event: WindowEventMap[K]) => void,
  ): void;
  getViewport(): { width: number; height: number };
}
