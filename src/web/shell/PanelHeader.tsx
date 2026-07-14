import { useEffect, useMemo, useState } from 'react';
import {
  groupViewModeIds,
  GROUP_VIEW_MODE_META,
  type GroupViewMode,
} from '../../core/contracts/groupView';
import { RECYCLE_BIN_PAGE_ID } from '../../core/contracts/systemPages';
import { useUiStore } from '../app/stores/uiStore';
import { useWorkspaceStore } from '../app/stores/workspaceStore';
import { useCanvasTools } from '../features/canvas/useCanvasTools';
import { resolveGroupViewMode } from '../domain/groupLayout';
import { isCollectionPageId, isRecycleBinPageId, isSystemPageId } from '../domain/workspace';
import { useI18n } from '../i18n/useI18n';
import { FeatureGate, useFeatureEnabled } from './FeatureGate';
import { ConfirmBar } from '../kit/confirm-bar';
import { Divider, PanelHeader as KitPanelHeader } from '../kit/panel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../kit/dropdown-menu';
import { IconButton } from '../kit/icon-button';
import { ThemeIcon, type ThemeIconName } from '../kit/icon';

const GROUP_VIEW_ICONS: Record<GroupViewMode, ThemeIconName> = {
  freeform: 'layoutGrid',
  waterfall: 'panel',
  list: 'list',
};

/**
 * Main panel header: group title, group-view switcher, history/canvas tools.
 * Freeform canvas tools pack into a single "Canvas tools" dropdown.
 * Search lives in the sidebar next to New group — not here.
 */
export function PanelHeader() {
  const { t } = useI18n();
  const historyEnabled = useFeatureEnabled('chrome.historyToolbar');
  const canvasToolsEnabled = useFeatureEnabled('chrome.canvasTools');
  const activePageId = useWorkspaceStore((state) => state.projection.activePageId);
  const pages = useWorkspaceStore((state) => state.projection.pages);
  const recycleBoxCount = useWorkspaceStore(
    (state) => state.projection.boxes.filter((box) => box.pageId === RECYCLE_BIN_PAGE_ID).length,
  );
  const setPageGroupLayout = useWorkspaceStore((state) => state.setPageGroupLayout);
  const emptyRecycleBin = useWorkspaceStore((state) => state.emptyRecycleBin);
  const undo = useWorkspaceStore((state) => state.undo);
  const redo = useWorkspaceStore((state) => state.redo);
  const canUndo = useWorkspaceStore((state) => state.historyPast.length > 0);
  const canRedo = useWorkspaceStore((state) => state.historyFuture.length > 0);
  const searchOpen = useUiStore((state) => state.searchOpen);
  const closeSearch = useUiStore((state) => state.closeSearch);
  const dragBusy = useUiStore((state) => Boolean(state.draggedBoxId || state.boxResizeActive));
  const { isLocked, items: canvasToolItems } = useCanvasTools();
  const [emptyRecycleConfirm, setEmptyRecycleConfirm] = useState(false);

  const title = useMemo(() => {
    if (searchOpen) return t('toolbar.search');
    if (isCollectionPageId(activePageId)) return t('shell.favorites');
    if (isRecycleBinPageId(activePageId)) return t('shell.recycleBin');
    const page = pages.find((entry) => entry.id === activePageId);
    return page?.title ?? t('page.untitled');
  }, [activePageId, pages, searchOpen, t]);

  const locateItem = canvasToolItems.find((item) => item.id === 'return-to-origin');
  const arrangeItem = canvasToolItems.find((item) => item.id === 'arrange-boxes');
  const lockItem = canvasToolItems.find((item) => item.id === 'toggle-canvas-lock');
  const showWorkspaceTools = !searchOpen && (historyEnabled || canvasToolsEnabled);
  const showGroupView = !searchOpen && !isSystemPageId(activePageId) && activePageId.length > 0;
  const activeGroupView = resolveGroupViewMode(pages, activePageId);
  const freeformTools = activeGroupView === 'freeform' && !isSystemPageId(activePageId);
  const isRecycleActive = !searchOpen && isRecycleBinPageId(activePageId);
  const showEmptyRecycle = isRecycleActive && recycleBoxCount > 0;

  useEffect(() => {
    if (!showEmptyRecycle) setEmptyRecycleConfirm(false);
  }, [showEmptyRecycle]);

  const leading = searchOpen ? (
    <IconButton
      className="cardo-panel-search-close"
      onClick={closeSearch}
      aria-label={t('common.close')}
      tooltip={t('common.close')}
    >
      <ThemeIcon name="close" size={16} />
    </IconButton>
  ) : null;

  const recycleTools =
    showEmptyRecycle && emptyRecycleConfirm ? (
      <ConfirmBar
        className="cardo-panel-empty-recycle-confirm"
        aria-label={t('page.emptyRecycleBin')}
        message={t('page.emptyRecycleBinConfirm')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.deletePermanently')}
        onCancel={() => setEmptyRecycleConfirm(false)}
        onConfirm={() => {
          emptyRecycleBin();
          setEmptyRecycleConfirm(false);
        }}
        danger
      />
    ) : showEmptyRecycle ? (
      <div className="cardo-surface-tools" aria-label={t('page.emptyRecycleBin')}>
        <IconButton
          onClick={() => setEmptyRecycleConfirm(true)}
          aria-label={t('page.emptyRecycleBin')}
          tooltip={t('page.emptyRecycleBin')}
        >
          <ThemeIcon name="trash" size={16} />
        </IconButton>
      </div>
    ) : null;

  const tools =
    recycleTools ??
    (showGroupView || showWorkspaceTools ? (
      <div className="cardo-surface-tools" aria-label={t('history.controls')}>
        {showGroupView ? (
          <div
            className="cardo-group-view-switcher"
            role="group"
            aria-label={t('groupView.switcher')}
          >
            {groupViewModeIds.map((mode) => {
              const meta = GROUP_VIEW_MODE_META[mode];
              const pressed = activeGroupView === mode;
              return (
                <IconButton
                  key={mode}
                  className="cardo-group-view-option"
                  pressed={pressed}
                  onClick={() => {
                    if (dragBusy) return;
                    setPageGroupLayout(activePageId, { groupViewMode: mode });
                  }}
                  aria-label={t(meta.labelKey)}
                  tooltip={`${t(meta.labelKey)} — ${t(meta.descriptionKey)}`}
                >
                  <ThemeIcon name={GROUP_VIEW_ICONS[mode]} size={15} />
                </IconButton>
              );
            })}
          </div>
        ) : null}
        {showGroupView && showWorkspaceTools ? <Divider /> : null}
        {showWorkspaceTools ? (
          <>
            <FeatureGate feature="chrome.historyToolbar">
              <IconButton
                disabled={!canUndo || dragBusy}
                onClick={undo}
                aria-label={t('history.undo')}
                tooltip={t('history.undo')}
              >
                <ThemeIcon name="undo" size={16} />
              </IconButton>
              <IconButton
                disabled={!canRedo || dragBusy}
                onClick={redo}
                aria-label={t('history.redo')}
                tooltip={t('history.redo')}
              >
                <ThemeIcon name="redo" size={16} />
              </IconButton>
            </FeatureGate>
            {historyEnabled && canvasToolsEnabled && freeformTools ? <Divider /> : null}
            {freeformTools ? (
              <FeatureGate feature="chrome.canvasTools">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    {/* No tooltip here — IconButton+HoverTip breaks Radix asChild ref. */}
                    <IconButton
                      pressed={isLocked}
                      disabled={dragBusy}
                      aria-label={t('canvas.layoutTools')}
                      title={t('canvas.layoutTools')}
                    >
                      <ThemeIcon name="options" size={16} />
                    </IconButton>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" side="bottom" sideOffset={4}>
                    <DropdownMenuItem
                      disabled={locateItem?.disabled}
                      onSelect={() => locateItem?.onSelect?.()}
                    >
                      {locateItem?.label ?? t('canvas.returnToOrigin')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={arrangeItem?.disabled}
                      onSelect={() => arrangeItem?.onSelect?.()}
                    >
                      {arrangeItem?.label ?? t('canvas.arrangeBoxes')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => lockItem?.onSelect?.()}>
                      {lockItem?.label ?? t('canvas.lockViewport')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </FeatureGate>
            ) : null}
          </>
        ) : null}
      </div>
    ) : null);

  return (
    <KitPanelHeader
      title={title}
      leading={leading}
      tools={tools}
      className="cardo-shell-panel-header"
    />
  );
}
