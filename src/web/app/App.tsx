/**
 * Cardo product UI root (sidebar + main panel shell). Production default.
 *
 * Single start path: `src/web/app/start.tsx` → `CardoApp` (this file).
 * Product tree lives under `src/web` only (app, shell, features, kit, themes).
 *
 * PR7 box→page drop (KD-18): mounts BoxPageDropController; product-nav / sidebar root is the
 * registerTopBarElement hit region (settings foot excluded); SidebarNav rows use
 * registerPageDropElement. Shared registry names kept until coordinated cutover rename.
 *
 * Feature gates (PR9 / KD-8 / KD-19):
 * - chrome.sidebar wraps product nav only; SettingsFoot stays outside and always on.
 * - chrome.bottomToolbar wraps BottomActionBar (create box only).
 * - chrome.globalSearch: sidebar / Ctrl+K (Cmd+K) opens SearchPage (local + web search action).
 */

import '@fontsource-variable/inter';
import { useEffect, useLayoutEffect, useState } from 'react';
import type { SettingsSectionId } from '../features/settings/settingsSearchCatalog';
import DesktopTitleBar from '../../desktop/DesktopTitleBar';
import { BoxPageDropController } from './BoxPageDropController';
import { WorkspaceCanvas } from '../features/canvas/WorkspaceCanvas';
import { RuntimeConnectionBanner } from '../features/runtime/RuntimeConnectionBanner';
import { ToastHost } from '../features/runtime/ToastHost';
import { applyWebNextTheme } from '../themes/themeRegistry';
import { FeatureGate } from '../shell/FeatureGate';
import { applyLayoutProfile } from '../shell/layouts/applyLayoutProfile';
import { applyCssSnippet } from '../shell/layouts/applyCssSnippet';
import { useCancelActivePointerOnWindowExit } from './useCancelActivePointerOnWindowExit';
import { usePasteIntoSelectedBox } from './usePasteIntoSelectedBox';
import { useWorkspaceHistoryShortcuts } from './useWorkspaceHistoryShortcuts';
import { usePreferencesStore } from './stores/preferencesStore';
import { AppShell } from '../shell/AppShell';
import { BottomActionBar } from '../shell/BottomActionBar';
import { MainStage } from '../shell/MainStage';
import { PanelHeader } from '../shell/PanelHeader';
import { SettingsFoot } from '../shell/SettingsFoot';
import { SettingsShell } from '../shell/SettingsShell';
import { SidebarNav } from '../shell/SidebarNav';
import { SearchPage } from '../features/global-search/SearchPage';
import { ContextMenuHost } from '../kit/context-menu';
import { TooltipProvider } from '../kit/tooltip';
import {
  sidebarNavRootClassName,
  sidebarNavRootRef,
  useSidebarBoxDropUi,
} from '../shell/SidebarPageDropBridge';
import { useUiStore } from './stores/uiStore';
import { useFeatureEnabled } from '../shell/FeatureGate';
import './styles.css';

export default function CardoApp() {
  useCancelActivePointerOnWindowExit();
  usePasteIntoSelectedBox();
  useWorkspaceHistoryShortcuts();

  const [mode, setMode] = useState<'workspace' | 'settings'>('workspace');
  const [settingsSection, setSettingsSection] = useState<SettingsSectionId>('general');
  const searchOpen = useUiStore((state) => state.searchOpen);
  const openSearch = useUiStore((state) => state.openSearch);
  const globalSearchEnabled = useFeatureEnabled('chrome.globalSearch');

  useEffect(() => {
    if (!globalSearchEnabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      if (mode === 'settings') setMode('workspace');
      openSearch();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [globalSearchEnabled, mode, openSearch]);

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
  const dropUi = useSidebarBoxDropUi();

  useLayoutEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    applyWebNextTheme(document.documentElement, themeId, colorMode, {
      fontFamily,
      fontScale,
      density,
      colorOverrides: themeColorOverrides,
      optionValues: themeOptionValues,
    });
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

  const closeSearch = useUiStore((state) => state.closeSearch);
  const openSettings = (section: SettingsSectionId = 'general') => {
    closeSearch();
    setSettingsSection(section);
    setMode('settings');
  };

  return (
    <TooltipProvider>
      <div
        className={['cardo-app', 'cardo-v2-app', isDesktopHost ? 'cardo-app-desktop' : '']
          .filter(Boolean)
          .join(' ')}
        data-shell="sidebar"
        data-mode={mode}
      >
        <DesktopTitleBar />
        <FeatureGate feature="chrome.runtimeBanner">
          <RuntimeConnectionBanner />
        </FeatureGate>
        <ToastHost />
        {mode === 'settings' ? (
          <SettingsShell onBack={() => setMode('workspace')} initialSection={settingsSection} />
        ) : (
          <>
            <BoxPageDropController />
            <AppShell
              productNav={
                <FeatureGate feature="chrome.sidebar">
                  <div
                    ref={sidebarNavRootRef}
                    className={sidebarNavRootClassName({
                      boxDragActive: dropUi.boxDragActive,
                      overNav: dropUi.overNav,
                      className: 'cardo-v2-product-nav',
                    })}
                    data-top-bar
                    data-v2-sidebar-nav
                  >
                    <SidebarNav />
                  </div>
                </FeatureGate>
              }
              settingsFoot={<SettingsFoot onOpen={() => openSettings('general')} />}
              main={
                <MainStage
                  header={<PanelHeader />}
                  canvas={globalSearchEnabled && searchOpen ? <SearchPage /> : <WorkspaceCanvas />}
                  bottomBar={
                    searchOpen ? null : (
                      <FeatureGate feature="chrome.bottomToolbar">
                        <BottomActionBar />
                      </FeatureGate>
                    )
                  }
                />
              }
            />
          </>
        )}
        <ContextMenuHost />
      </div>
    </TooltipProvider>
  );
}
