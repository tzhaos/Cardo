import '@fontsource-variable/inter';
import { useLayoutEffect } from 'react';
import { BottomToolbar } from '../components/bottom-toolbar/BottomToolbar';
import { WorkspaceCanvas } from '../components/canvas/WorkspaceCanvas';
import { FloatingMenuLayer } from '../components/floating-menu/FloatingMenuLayer';
import { FloatingMenuProvider } from '../components/floating-menu/useFloatingMenu';
import { TopBar } from '../components/top-bar/TopBar';
import { usePasteIntoSelectedBox } from './usePasteIntoSelectedBox';
import { usePreferencesStore } from './stores/preferencesStore';
import { applyWebNextTheme } from '../themes/themeRegistry';
import './styles.css';

export default function WebNextApp() {
  usePasteIntoSelectedBox();
  const colorMode = usePreferencesStore((state) => state.colorMode);
  const locale = usePreferencesStore((state) => state.locale);
  const themeId = usePreferencesStore((state) => state.themeId);

  useLayoutEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    applyWebNextTheme(document.documentElement, themeId, colorMode);
  }, [colorMode, locale, themeId]);

  return (
    <FloatingMenuProvider>
      <div className="wbn-app">
        <TopBar />
        <WorkspaceCanvas />
        <BottomToolbar />
        <FloatingMenuLayer />
      </div>
    </FloatingMenuProvider>
  );
}
