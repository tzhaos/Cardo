import '@fontsource-variable/inter';
import { useLayoutEffect } from 'react';
import { BottomToolbar } from '../components/bottom-toolbar/BottomToolbar';
import DesktopTitleBar from '../../desktop/DesktopTitleBar';
import { WorkspaceCanvas } from '../components/canvas/WorkspaceCanvas';
import { CanvasToolsToolbar } from '../components/canvas/CanvasToolsToolbar';
import { FloatingMenuLayer } from '../components/floating-menu/FloatingMenuLayer';
import { FloatingMenuProvider } from '../components/floating-menu/useFloatingMenu';
import { SettingsWindow } from '../components/settings/SettingsWindow';
import { HistoryToolbar } from '../components/history-toolbar/HistoryToolbar';
import { TopBar } from '../components/top-bar/TopBar';
import { applyWebNextTheme } from '../themes/themeRegistry';
import { useCancelActivePointerOnWindowExit } from './useCancelActivePointerOnWindowExit';
import { usePasteIntoSelectedBox } from './usePasteIntoSelectedBox';
import { useWorkspaceHistoryShortcuts } from './useWorkspaceHistoryShortcuts';
import { usePreferencesStore } from './stores/preferencesStore';
import { BoxPageDropController } from './BoxPageDropController';
import { TooltipProvider } from '../ui/primitives/tooltip';
import './styles.css';

export default function WebNextApp() {
  useCancelActivePointerOnWindowExit();
  usePasteIntoSelectedBox();
  useWorkspaceHistoryShortcuts();
  const colorMode = usePreferencesStore((state) => state.colorMode);
  const locale = usePreferencesStore((state) => state.locale);
  const themeId = usePreferencesStore((state) => state.themeId);
  const isDesktopHost = typeof window !== 'undefined' && Boolean(window.khaosboxDesktop);

  useLayoutEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    applyWebNextTheme(document.documentElement, themeId, colorMode);
  }, [colorMode, locale, themeId]);

  return (
    <TooltipProvider>
      <FloatingMenuProvider>
        <div className={`wbn-app${isDesktopHost ? ' wbn-app-desktop' : ''}`}>
          <DesktopTitleBar />
          <BoxPageDropController />
          <TopBar />
          <HistoryToolbar />
          <WorkspaceCanvas />
          <CanvasToolsToolbar />
          <BottomToolbar />
          <FloatingMenuLayer />
          <SettingsWindow />
        </div>
      </FloatingMenuProvider>
    </TooltipProvider>
  );
}
