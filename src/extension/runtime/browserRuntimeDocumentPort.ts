import type { RuntimeDocumentPort } from '../../core/ports/RuntimeDocumentPort';

export const browserRuntimeDocumentPort: RuntimeDocumentPort = {
  setDocumentTitle(title) {
    document.title = title;
  },
  setTheme(theme) {
    document.documentElement.dataset.theme = theme;
  },
  addWindowListener(type, listener) {
    window.addEventListener(type, listener as EventListener);
  },
  removeWindowListener(type, listener) {
    window.removeEventListener(type, listener as EventListener);
  },
  getViewport() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  },
};
