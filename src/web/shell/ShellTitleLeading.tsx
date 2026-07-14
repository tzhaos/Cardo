import { useEffect, useRef } from 'react';
import { useCanvasStore } from '../app/stores/canvasStore';
import { useUiStore } from '../app/stores/uiStore';
import { useWorkspaceStore } from '../app/stores/workspaceStore';
import {
  constrainBoxFrameToCanvas,
  createCanvasWorldBounds,
  getCanvasViewportCenter,
} from '../domain/canvasGeometry';
import { createBoxFrameCenteredAt } from '../domain/placement';
import { isSystemPageId } from '../domain/workspace';
import { exportWorkspaceData, parseWorkspaceImportFile } from '../platform/hostPlatform';
import { useI18n } from '../i18n/useI18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../kit/dropdown-menu';
import { IconButton } from '../kit/icon-button';
import { ThemeIcon } from '../kit/icon';
import { showToast } from '../app/stores/toastStore';
import { useFeatureEnabled } from './FeatureGate';

/**
 * Titlebar leading chrome (product IA):
 * sidebar collapse · back · forward · File menu.
 * Rendered in DesktopTitleBar (desktop) or AppShell web strip.
 */
export function ShellTitleLeading({
  onOpenSettings,
  workspaceActionsDisabled = false,
}: {
  onOpenSettings?: () => void;
  /** When true (e.g. settings mode), disable new/import/nav; settings + export stay. */
  workspaceActionsDisabled?: boolean;
} = {}) {
  const { t } = useI18n();
  const importInputRef = useRef<HTMLInputElement>(null);
  const sidebarEnabled = useFeatureEnabled('chrome.sidebar');
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebarCollapsed = useUiStore((state) => state.toggleSidebarCollapsed);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const canBack = useUiStore((state) => state.navPast.length > 0);
  const canForward = useUiStore((state) => state.navFuture.length > 0);
  const requestNavBack = useUiStore((state) => state.requestNavBack);
  const requestNavForward = useUiStore((state) => state.requestNavForward);
  const setActivePage = useWorkspaceStore((state) => state.setActivePage);
  const createPage = useWorkspaceStore((state) => state.createPage);
  const createBox = useWorkspaceStore((state) => state.createBox);
  const importWorkspace = useWorkspaceStore((state) => state.importWorkspace);
  const pages = useWorkspaceStore((state) => state.projection.pages);
  const selectBox = useUiStore((state) => state.selectBox);
  const activePageId = useWorkspaceStore((state) => state.projection.activePageId);
  const multiPage = useFeatureEnabled('workspace.multiPage');
  const closeSearch = useUiStore((state) => state.closeSearch);
  const dragBusy = useUiStore((state) => Boolean(state.draggedBoxId || state.boxResizeActive));
  const actionsLocked = workspaceActionsDisabled || dragBusy;

  // Feature gate off always shows nav via ShowSidebarControl — force expanded chrome state.
  useEffect(() => {
    if (!sidebarEnabled) setSidebarCollapsed(false);
  }, [setSidebarCollapsed, sidebarEnabled]);

  const validPageIds = () => new Set(pages.map((page) => page.id));

  const goBack = () => {
    if (actionsLocked) return;
    const pageId = requestNavBack(validPageIds());
    if (!pageId) return;
    closeSearch();
    setActivePage(pageId, 'nav-back');
  };

  const goForward = () => {
    if (actionsLocked) return;
    const pageId = requestNavForward(validPageIds());
    if (!pageId) return;
    closeSearch();
    setActivePage(pageId, 'nav-forward');
  };

  const handleNewGroup = () => {
    if (actionsLocked || !multiPage) return;
    closeSearch();
    createPage(t('page.untitled'));
  };

  const handleNewBox = () => {
    if (actionsLocked || isSystemPageId(activePageId)) return;
    closeSearch();
    const canvas = useCanvasStore.getState();
    const camera = canvas.pages[activePageId]?.camera ?? { panX: 0, panY: 0 };
    const viewportSize = canvas.viewportSize;
    const center = getCanvasViewportCenter({ panX: camera.panX, panY: camera.panY }, viewportSize);
    const frame = constrainBoxFrameToCanvas(
      createBoxFrameCenteredAt(center),
      createCanvasWorldBounds(viewportSize),
    );
    createBox(frame, t('box.general'));
  };

  const handleExport = () => {
    void (async () => {
      try {
        await exportWorkspaceData();
        showToast(t('toast.exportOk'), 'success');
      } catch {
        showToast(t('toast.exportFailed'), 'error');
      }
    })();
  };

  const handleImportFile = (file: File) => {
    void (async () => {
      try {
        const parsed = await parseWorkspaceImportFile(file);
        if (!window.confirm(t('settings.importConfirm'))) return;
        importWorkspace(parsed.workspace);
        selectBox(null);
      } catch {
        showToast(t('settings.importInvalid'), 'error');
      }
    })();
  };

  return (
    <div className="cardo-shell-title-leading" onDoubleClick={(event) => event.stopPropagation()}>
      {sidebarEnabled ? (
        <IconButton
          className="cardo-shell-title-control"
          pressed={!sidebarCollapsed}
          onClick={() => toggleSidebarCollapsed()}
          aria-label={sidebarCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
          tooltip={sidebarCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
        >
          <ThemeIcon name="panelLeft" size={15} />
        </IconButton>
      ) : null}
      <IconButton
        className="cardo-shell-title-control"
        disabled={!canBack || actionsLocked}
        onClick={goBack}
        aria-label={t('shell.navBack')}
        tooltip={t('shell.navBack')}
      >
        <ThemeIcon name="chevronLeft" size={15} />
      </IconButton>
      <IconButton
        className="cardo-shell-title-control"
        disabled={!canForward || actionsLocked}
        onClick={goForward}
        aria-label={t('shell.navForward')}
        tooltip={t('shell.navForward')}
      >
        <ThemeIcon name="chevronRight" size={15} />
      </IconButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="cardo-shell-file-menu-trigger"
            aria-label={t('shell.fileMenu')}
          >
            <span>{t('shell.fileMenu')}</span>
            <ThemeIcon name="chevronDown" size={12} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="bottom" sideOffset={4}>
          {multiPage ? (
            <DropdownMenuItem disabled={actionsLocked} onSelect={handleNewGroup}>
              {t('shell.newPage')}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            disabled={actionsLocked || isSystemPageId(activePageId)}
            onSelect={handleNewBox}
          >
            {t('shell.createBox')}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={dragBusy}
            onSelect={() => {
              onOpenSettings?.();
            }}
          >
            {t('shell.settings')}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={actionsLocked}
            onSelect={() => importInputRef.current?.click()}
          >
            {t('shell.importWorkspace')}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={dragBusy} onSelect={handleExport}>
            {t('shell.exportWorkspace')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="cardo-data-file-input"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleImportFile(file);
          event.currentTarget.value = '';
        }}
      />
    </div>
  );
}
