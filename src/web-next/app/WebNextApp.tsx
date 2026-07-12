import '@fontsource-variable/inter';
import { useLayoutEffect } from 'react';
import { BottomToolbar } from '../components/bottom-toolbar/BottomToolbar';
import DesktopTitleBar from '../../desktop/DesktopTitleBar';
import { WorkspaceCanvas } from '../components/canvas/WorkspaceCanvas';
import { CanvasToolsToolbar } from '../components/canvas/CanvasToolsToolbar';
import { SettingsWindow } from '../components/settings/SettingsWindow';
import { HistoryToolbar } from '../components/history-toolbar/HistoryToolbar';
import { RuntimeConnectionBanner } from '../components/runtime/RuntimeConnectionBanner';
import { TopBar } from '../components/top-bar/TopBar';
import { applyWebNextTheme } from '../themes/themeRegistry';
import { FeatureGate } from '../shell/FeatureGate';
import { applyLayoutProfile } from '../shell/layouts/applyLayoutProfile';
import { applyCssSnippet } from '../shell/layouts/applyCssSnippet';
import { useCancelActivePointerOnWindowExit } from './useCancelActivePointerOnWindowExit';
import { usePasteIntoSelectedBox } from './usePasteIntoSelectedBox';
import { useWorkspaceHistoryShortcuts } from './useWorkspaceHistoryShortcuts';
import { usePreferencesStore } from './stores/preferencesStore';
import { BoxPageDropController } from './BoxPageDropController';
import { ContextMenuHost } from '../ui/cardo/context-menu';
import { TooltipProvider } from '../ui/primitives/tooltip';
import './styles.css';

export default function WebNextApp() {
  useCancelActivePointerOnWindowExit();
  usePasteIntoSelectedBox();
  useWorkspaceHistoryShortcuts();
  const colorMode = usePreferencesStore((state) => state.colorMode);
  const locale = usePreferencesStore((state) => state.locale);
  const themeId = usePreferencesStore((state) => state.themeId);
  const fontFamily = usePreferencesStore((state) => state.fontFamily);
  const fontScale = usePreferencesStore((state) => state.fontScale);
  const density = usePreferencesStore((state) => state.density);
  const themeColorOverrides = usePreferencesStore((state) => state.themeColorOverrides);
  const themeOptionValues = usePreferencesStore((state) => state.themeOptionValues);
  const cssSnippet = usePreferencesStore((state) => state.cssSnippet);
  const cssSnippetEnabled = usePreferencesStore((state) => state.cssSnippetEnabled);
  const isDesktopHost = typeof window !== 'undefined' && Boolean(window.cardoDesktop);

  useLayoutEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    applyWebNextTheme(document.documentElement, themeId, colorMode, {
      fontFamily,
      fontScale,
      density,
      colorOverrides: themeColorOverrides,
      optionValues: themeOptionValues,
    });
    // Shell layout is product-fixed classic (always-visible chrome).
    applyLayoutProfile(document.documentElement);
    applyCssSnippet({
      themeId,
      userSnippet: cssSnippet,
      userSnippetEnabled: cssSnippetEnabled,
    });
  }, [
    colorMode,
    cssSnippet,
    cssSnippetEnabled,
    density,
    fontFamily,
    fontScale,
    locale,
    themeColorOverrides,
    themeId,
    themeOptionValues,
  ]);

  return (
    <TooltipProvider>
      <div className={`cardo-app${isDesktopHost ? ' cardo-app-desktop' : ''}`}>
        <DesktopTitleBar />
        <BoxPageDropController />
        <FeatureGate feature="chrome.topBar">
          <TopBar />
        </FeatureGate>
        <FeatureGate feature="chrome.historyToolbar">
          <HistoryToolbar />
        </FeatureGate>
        <FeatureGate feature="chrome.runtimeBanner">
          <RuntimeConnectionBanner />
        </FeatureGate>
        <WorkspaceCanvas />
        <FeatureGate feature="chrome.canvasTools">
          <CanvasToolsToolbar />
        </FeatureGate>
        <FeatureGate feature="chrome.bottomToolbar">
          <BottomToolbar />
        </FeatureGate>
        <SettingsWindow />
        <ContextMenuHost />
      </div>
    </TooltipProvider>
  );
}
