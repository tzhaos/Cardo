/**
 * Cardo product UI root (sidebar + main panel shell). Production default.
 *
 * Single start path: `src/web/app/start.tsx` → `CardoApp` (this file).
 * Product tree lives under `src/web` only (app, shell, features, kit, themes).
 *
 * PR7 box→page drop (KD-18): mounts BoxPageDropController; product-nav / sidebar root is the
 * registerPrimaryNavElement hit region (settings foot excluded); SidebarNav rows use
 * registerPageDropElement.
 *
 * Feature gates (PR9 / KD-8 / KD-19):
 * - chrome.sidebar wraps product nav only; SettingsFoot stays outside and always on.
 * - When chrome.sidebar is off, productNav shows a re-enable control (escape hatch).
 * - chrome.bottomToolbar wraps BottomActionBar (create box only).
 * - chrome.globalSearch: sidebar / Ctrl+K (Cmd+K) opens SearchPage as an overlay on the canvas.
 */

import '@fontsource-variable/inter';
import { useEffect, useLayoutEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
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
import { useNavHistorySync } from './useNavHistorySync';
import { usePasteIntoSelectedBox } from './usePasteIntoSelectedBox';
import { useWorkspaceHistoryShortcuts } from './useWorkspaceHistoryShortcuts';
import { usePreferencesStore } from './stores/preferencesStore';
import { AppShell } from '../shell/AppShell';
import { BottomActionBar } from '../shell/BottomActionBar';
import { MainStage } from '../shell/MainStage';
import { PanelHeader } from '../shell/PanelHeader';
import { SettingsFoot } from '../shell/SettingsFoot';
import { SettingsShell } from '../shell/SettingsShell';
import { ShellTitleLeading } from '../shell/ShellTitleLeading';
import { SidebarNav } from '../shell/SidebarNav';
import { SearchPage } from '../features/global-search/SearchPage';
import { ContextMenuHost } from '../kit/context-menu';
import { NavItem } from '../kit/nav-item';
import { ThemeIcon } from '../kit/icon';
import { TooltipProvider } from '../kit/tooltip';
import {
  sidebarNavItemClassName,
  sidebarNavRootClassName,
  sidebarNavRootRef,
  useSidebarBoxDropUi,
} from '../shell/SidebarPageDropBridge';
import { useUiStore } from './stores/uiStore';
import { useWorkspaceStore } from './stores/workspaceStore';
import { useFeatureEnabled } from '../shell/FeatureGate';
import { useI18n } from '../i18n/useI18n';
import './styles.css';

export default function CardoApp() {
  useCancelActivePointerOnWindowExit();
  usePasteIntoSelectedBox();
  useWorkspaceHistoryShortcuts();
  useNavHistorySync();

  const [mode, setMode] = useState<'workspace' | 'settings'>('workspace');
  const [settingsSection, setSettingsSection] = useState<SettingsSectionId>('general');
  const searchOpen = useUiStore((state) => state.searchOpen);
  const openSearch = useUiStore((state) => state.openSearch);
  const globalSearchEnabled = useFeatureEnabled('chrome.globalSearch');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd+K — search
      if (
        globalSearchEnabled &&
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault();
        if (mode === 'settings') setMode('workspace');
        openSearch();
        return;
      }
      // Ctrl/Cmd+B — toggle sidebar
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'b'
      ) {
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
        useUiStore.getState().toggleSidebarCollapsed();
        return;
      }
      // Escape — clear item multi-select
      if (event.key === 'Escape') {
        const ui = useUiStore.getState();
        if (ui.selectionBoxId || Object.keys(ui.selectedItemIds).length > 0) {
          if (isEditableTarget(event.target)) return;
          event.preventDefault();
          ui.clearItemSelection();
          return;
        }
      }
      // Alt+← / Alt+→ — page history (workspace mode only; not when typing)
      if (event.altKey && !event.ctrlKey && !event.metaKey && mode === 'workspace') {
        if (isEditableTarget(event.target)) return;
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        const ui = useUiStore.getState();
        if (ui.draggedBoxId || ui.boxResizeActive) return;
        const pages = useWorkspaceStore.getState().projection.pages;
        const valid = new Set(pages.map((page) => page.id));
        event.preventDefault();
        const pageId =
          event.key === 'ArrowLeft' ? ui.requestNavBack(valid) : ui.requestNavForward(valid);
        if (!pageId) return;
        ui.closeSearch();
        useWorkspaceStore
          .getState()
          .setActivePage(pageId, event.key === 'ArrowLeft' ? 'nav-back' : 'nav-forward');
      }
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
  const isDesktopHost = typeof window !== 'undefined' && Boolean(window.cardoDesktop);
  const dropUi = useSidebarBoxDropUi();

  useLayoutEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    // No user color overrides / CSS snippets — official theme chrome only.
    applyWebNextTheme(document.documentElement, themeId, colorMode, {
      fontFamily,
      fontScale,
      density,
      colorOverrides: {},
      optionValues: {},
    });
    applyLayoutProfile(document.documentElement);
    applyCssSnippet({
      themeId,
      userSnippet: '',
      userSnippetEnabled: false,
    });
  }, [colorMode, density, fontFamily, fontScale, locale, themeId]);

  const closeSearch = useUiStore((state) => state.closeSearch);
  const openSettings = (section: SettingsSectionId = 'general') => {
    closeSearch();
    setSettingsSection(section);
    setMode('settings');
  };

  const titleLeading = (
    <ShellTitleLeading
      onOpenSettings={() => openSettings('general')}
      workspaceActionsDisabled={mode === 'settings'}
    />
  );

  return (
    <TooltipProvider>
      <MotionConfig reducedMotion="user">
        <div
          className={['cardo-app', 'cardo-shell-app', isDesktopHost ? 'cardo-app-desktop' : '']
            .filter(Boolean)
            .join(' ')}
          data-shell="sidebar"
          data-mode={mode}
        >
          <DesktopTitleBar leading={titleLeading} />
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
                webTitleLeading={isDesktopHost ? undefined : titleLeading}
                productNav={
                  <FeatureGate feature="chrome.sidebar" fallback={<ShowSidebarControl />}>
                    <div
                      ref={sidebarNavRootRef}
                      className={sidebarNavRootClassName({
                        boxDragActive: dropUi.boxDragActive,
                        overNav: dropUi.overNav,
                        className: 'cardo-shell-product-nav',
                      })}
                      data-primary-nav
                      data-shell-sidebar-nav
                    >
                      <SidebarNav />
                    </div>
                  </FeatureGate>
                }
                settingsFoot={<SettingsFoot onOpen={() => openSettings('general')} />}
                main={
                  <MainStage
                    header={<PanelHeader />}
                    canvas={
                      <>
                        <WorkspaceCanvas />
                        {globalSearchEnabled && searchOpen ? <SearchPage /> : null}
                      </>
                    }
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
      </MotionConfig>
    </TooltipProvider>
  );
}

/** Thin rail control when chrome.sidebar is off — re-enables navigation without Settings. */
function ShowSidebarControl() {
  const { t } = useI18n();
  const setFeatureEnabled = usePreferencesStore((state) => state.setFeatureEnabled);

  return (
    <div className="cardo-shell-product-nav" data-shell-sidebar-nav-fallback="">
      <div className="cardo-shell-sidebar-scroll">
        <div className="cardo-shell-nav-block">
          <NavItem
            className={sidebarNavItemClassName({})}
            icon={<ThemeIcon name="list" size={16} />}
            aria-label={t('shell.showSidebar')}
            onClick={() => setFeatureEnabled('chrome.sidebar', true)}
          >
            {t('shell.showSidebar')}
          </NavItem>
        </div>
      </div>
    </div>
  );
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest('input,textarea,select,[contenteditable="true"]'))
  );
}
