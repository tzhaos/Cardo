import { useMemo } from 'react';
import { useWorkspaceStore } from '../app/stores/workspaceStore';
import { useCanvasTools } from '../features/canvas/useCanvasTools';
import { isCollectionPageId, isRecycleBinPageId } from '../domain/workspace';
import { useI18n } from '../i18n/useI18n';
import { FeatureGate, useFeatureEnabled } from './FeatureGate';
import { Divider, PanelHeader as KitPanelHeader } from '../kit/panel';
import { IconButton } from '../kit/icon-button';
import { ThemeIcon } from '../kit/icon';

/**
 * Main panel header via Kit PanelHeader + feature-gated tools.
 */
export function PanelHeader() {
  const { t } = useI18n();
  const historyEnabled = useFeatureEnabled('chrome.historyToolbar');
  const canvasToolsEnabled = useFeatureEnabled('chrome.canvasTools');
  const activePageId = useWorkspaceStore((state) => state.projection.activePageId);
  const pages = useWorkspaceStore((state) => state.projection.pages);
  const undo = useWorkspaceStore((state) => state.undo);
  const redo = useWorkspaceStore((state) => state.redo);
  const canUndo = useWorkspaceStore((state) => state.historyPast.length > 0);
  const canRedo = useWorkspaceStore((state) => state.historyFuture.length > 0);
  const { isLocked, items: canvasToolItems } = useCanvasTools();

  const title = useMemo(() => {
    if (isCollectionPageId(activePageId)) return t('shell.favorites');
    if (isRecycleBinPageId(activePageId)) return t('shell.recycleBin');
    const page = pages.find((entry) => entry.id === activePageId);
    return page?.title ?? t('page.untitled');
  }, [activePageId, pages, t]);

  const locateItem = canvasToolItems.find((item) => item.id === 'return-to-origin');
  const lockItem = canvasToolItems.find((item) => item.id === 'toggle-canvas-lock');
  const showTools = historyEnabled || canvasToolsEnabled;

  const tools = showTools ? (
    <div className="cardo-surface-tools" aria-label={t('history.controls')}>
      <FeatureGate feature="chrome.historyToolbar">
        <IconButton
          disabled={!canUndo}
          onClick={undo}
          aria-label={t('history.undo')}
          tooltip={t('history.undo')}
        >
          <ThemeIcon name="undo" size={16} />
        </IconButton>
        <IconButton
          disabled={!canRedo}
          onClick={redo}
          aria-label={t('history.redo')}
          tooltip={t('history.redo')}
        >
          <ThemeIcon name="redo" size={16} />
        </IconButton>
      </FeatureGate>
      {historyEnabled && canvasToolsEnabled ? <Divider /> : null}
      <FeatureGate feature="chrome.canvasTools">
        <IconButton
          disabled={locateItem?.disabled}
          onClick={() => locateItem?.onSelect?.()}
          aria-label={locateItem?.label ?? t('canvas.returnToOrigin')}
          tooltip={locateItem?.label ?? t('canvas.returnToOrigin')}
        >
          <ThemeIcon name="locate" size={16} />
        </IconButton>
        <IconButton
          pressed={isLocked}
          onClick={() => lockItem?.onSelect?.()}
          aria-label={lockItem?.label ?? t('canvas.lockViewport')}
          tooltip={lockItem?.label ?? t('canvas.lockViewport')}
        >
          <ThemeIcon name={isLocked ? 'lock' : 'unlock'} size={16} />
        </IconButton>
      </FeatureGate>
    </div>
  ) : null;

  return <KitPanelHeader title={title} tools={tools} className="cardo-v2-panel-header" />;
}
