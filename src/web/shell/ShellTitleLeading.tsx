import { useEffect } from 'react';
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
import { exportWorkspaceData } from '../platform/hostPlatform';
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
}: {
  onOpenSettings?: () => void;
} = {}) {
  const { t } = useI18n();
  const sidebarEnabled = useFeatureEnabled('chrome.sidebar');
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebarCollapsed = useUiStore((state) => state.toggleSidebarCollapsed);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const canBack = useUiStore((state) => state.navPast.length > 0);
  const canForward = useUiStore((state) => state.navFuture.length > 0);
  const consumeNavBack = useUiStore((state) => state.consumeNavBack);
  const consumeNavForward = useUiStore((state) => state.consumeNavForward);
  const setActivePage = useWorkspaceStore((state) => state.setActivePage);
  const createPage = useWorkspaceStore((state) => state.createPage);
  const createBox = useWorkspaceStore((state) => state.createBox);
  const activePageId = useWorkspaceStore((state) => state.projection.activePageId);
  const multiPage = useFeatureEnabled('workspace.multiPage');
  const closeSearch = useUiStore((state) => state.closeSearch);
  const dragBusy = useUiStore((state) => Boolean(state.draggedBoxId || state.boxResizeActive));

  // Feature gate off always shows nav via ShowSidebarControl — force expanded chrome state.
  useEffect(() => {
    if (!sidebarEnabled) setSidebarCollapsed(false);
  }, [setSidebarCollapsed, sidebarEnabled]);

  const goBack = () => {
    if (dragBusy) return;
    const pageId = consumeNavBack();
    if (!pageId) return;
    closeSearch();
    setActivePage(pageId, 'nav-back');
  };

  const goForward = () => {
    if (dragBusy) return;
    const pageId = consumeNavForward();
    if (!pageId) return;
    closeSearch();
    setActivePage(pageId, 'nav-forward');
  };

  const handleNewGroup = () => {
    if (dragBusy || !multiPage) return;
    closeSearch();
    createPage(t('page.untitled'));
  };

  const handleNewBox = () => {
    if (dragBusy || isSystemPageId(activePageId)) return;
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
        disabled={!canBack || dragBusy}
        onClick={goBack}
        aria-label={t('shell.navBack')}
        tooltip={t('shell.navBack')}
      >
        <ThemeIcon name="chevronLeft" size={15} />
      </IconButton>
      <IconButton
        className="cardo-shell-title-control"
        disabled={!canForward || dragBusy}
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
            <DropdownMenuItem disabled={dragBusy} onSelect={handleNewGroup}>
              {t('shell.newPage')}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            disabled={dragBusy || isSystemPageId(activePageId)}
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
          <DropdownMenuItem disabled={dragBusy} onSelect={handleExport}>
            {t('shell.exportWorkspace')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
