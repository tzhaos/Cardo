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
 * - chrome.bottomToolbar wraps BottomActionBar; search UI is chrome.globalSearch
 *   (dependsOn bottomToolbar in the catalog).
 */

import '@fontsource-variable/inter';
import { useLayoutEffect, useState } from 'react';
import type { SettingsSectionId } from '../features/settings/settingsSearchCatalog';
import DesktopTitleBar from '../../desktop/DesktopTitleBar';
import { BoxPageDropController } from './BoxPageDropController';
import { WorkspaceCanvas } from '../features/canvas/WorkspaceCanvas';
import { RuntimeConnectionBanner } from '../features/runtime/RuntimeConnectionBanner';
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
import { ContextMenuHost } from '../kit/context-menu';
import { TooltipProvider } from '../kit/tooltip';
import {
  sidebarNavRootClassName,
  sidebarNavRootRef,
  useSidebarBoxDropUi,
} from '../shell/SidebarPageDropBridge';
import './styles.css';

export default function CardoApp() {
  useCancelActivePointerOnWindowExit();
  usePasteIntoSelectedBox();
  useWorkspaceHistoryShortcuts();

  const [mode, setMode] = useState<'workspace' | 'settings'>('workspace');
  const [settingsSection, setSettingsSection] = useState<SettingsSectionId>('general');

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

  const openSettings = (section: SettingsSectionId = 'general') => {
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
                  canvas={<WorkspaceCanvas />}
                  bottomBar={
                    <FeatureGate feature="chrome.bottomToolbar">
                      <BottomActionBar />
                    </FeatureGate>
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
