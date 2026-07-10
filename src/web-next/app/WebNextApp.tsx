import '@fontsource-variable/inter';
import { useLayoutEffect } from 'react';
import { BottomToolbar } from '../components/bottom-toolbar/BottomToolbar';
import DesktopTitleBar from '../../desktop/DesktopTitleBar';
import { WorkspaceCanvas } from '../components/canvas/WorkspaceCanvas';
import { FloatingMenuLayer } from '../components/floating-menu/FloatingMenuLayer';
import { FloatingMenuProvider } from '../components/floating-menu/useFloatingMenu';
import { SettingsWindow } from '../components/settings/SettingsWindow';
import { OperationJournalWindow } from '../components/operation-journal/OperationJournalWindow';
import { TopBar } from '../components/top-bar/TopBar';
import { applyWebNextTheme } from '../themes/themeRegistry';
import { useCancelActivePointerOnWindowExit } from './useCancelActivePointerOnWindowExit';
import { usePasteIntoSelectedBox } from './usePasteIntoSelectedBox';
import { useWorkspaceHistoryShortcuts } from './useWorkspaceHistoryShortcuts';
import { usePreferencesStore } from './stores/preferencesStore';
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
    <FloatingMenuProvider>
      <div className={`wbn-app${isDesktopHost ? ' wbn-app-desktop' : ''}`}>
        <DesktopTitleBar />
        <TopBar />
        <WorkspaceCanvas />
        <BottomToolbar />
        <FloatingMenuLayer />
        <SettingsWindow />
        <OperationJournalWindow />
      </div>
    </FloatingMenuProvider>
  );
}
