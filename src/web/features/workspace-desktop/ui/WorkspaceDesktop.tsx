import { FolderOpen, LayoutGrid, PanelsTopLeft, Plus, Search, Settings2, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { WorkspaceBox } from '../../../../core/domains/workspace/model/workspace';
import { ToastViewport } from '../../../app/presentation/ToastViewport';
import { useI18n } from '../../../app/hooks/useI18n';
import ManagedBox from '../../box-management';
import SettingsPanel from '../../settings';
import { useWorkspaceGlobalEvents } from '../hooks/useWorkspaceGlobalEvents';
import { useWorkspaceDesktopState } from '../hooks/useWorkspaceDesktopState';
import SnapOverlay from './SnapOverlay';
import WorkspaceCommandCenter from './WorkspaceCommandCenter';

function getBoxTitle(box: WorkspaceBox, fallback: string) {
  return box.customTitle?.trim() || fallback;
}

function WorkspaceSidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="kb-shell-section">
      <div className="kb-shell-section-label">{title}</div>
      <div className="kb-shell-section-body">{children}</div>
    </section>
  );
}

export default function WorkspaceDesktop() {
  const { t } = useI18n();
  const state = useWorkspaceDesktopState();

  useWorkspaceGlobalEvents();

  const activeTabLabel = useMemo(
    () => state.tabs.find((tab) => tab.id === state.activeTabId)?.label ?? state.tabs[0]?.label ?? '',
    [state.activeTabId, state.tabs],
  );

  return (
    <div className="kb-workspace-shell">
      <aside className="kb-sidebar">
        <div className="kb-sidebar-header">
          <div>
            <div className="kb-app-eyebrow">{state.brandLabel}</div>
            <h1 className="kb-app-title">{activeTabLabel}</h1>
          </div>
          <button
            type="button"
            className="kb-icon-button"
            onClick={state.openSettings}
            aria-label={t('settings.title')}
            title={t('settings.title')}
          >
            <Settings2 size={16} />
          </button>
        </div>

        <WorkspaceSidebarSection title={t('workspace.commandCenter')}>
          <div className="kb-quick-actions">
            <button
              type="button"
              className="kb-primary-button"
              onClick={() => state.createBoxForActiveTab({ centerX: 720, centerY: 320 })}
              disabled={state.hasReachedBoxLimit}
            >
              <Plus size={16} />
              <span>{t('workspace.addBox')}</span>
            </button>
            <button type="button" className="kb-secondary-button" onClick={state.openSettings}>
              <PanelsTopLeft size={16} />
              <span>{t('settings.title')}</span>
            </button>
          </div>
          <div className="kb-command-center-slot">
            <WorkspaceCommandCenter
              onOpenSettings={state.openSettings}
              onSelectTemplatePage={state.setActiveTabId}
              onRevealBox={(boxId) => {
                state.dispatch({ type: 'box.bringToFront', boxId });
              }}
            />
          </div>
        </WorkspaceSidebarSection>

        <WorkspaceSidebarSection title={t('workspace.productPages')}>
          <div className="kb-nav-list">
            {state.tabs.map((tab) => {
              const isActive = tab.id === state.activeTabId;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={isActive ? 'kb-nav-item kb-nav-item-active' : 'kb-nav-item'}
                  onClick={() => state.setActiveTabId(tab.id)}
                >
                  <span className="kb-nav-item-main">
                    <LayoutGrid size={15} />
                    <span>{tab.label}</span>
                  </span>
                  <span className="kb-nav-item-meta">{state.boxCountsByTemplate[tab.id] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </WorkspaceSidebarSection>

        <WorkspaceSidebarSection title={t('workspace.recentBoxes')}>
          <div className="kb-nav-list">
            {state.recentBoxes.map((box) => (
              <button
                key={box.id}
                type="button"
                className="kb-nav-item"
                onClick={() => state.dispatch({ type: 'box.bringToFront', boxId: box.id })}
              >
                <span className="kb-nav-item-main">
                  <FolderOpen size={15} />
                  <span>{getBoxTitle(box, t('workspace.untitledBox'))}</span>
                </span>
              </button>
            ))}
          </div>
        </WorkspaceSidebarSection>
      </aside>

      <main className="kb-main-panel">
        <header className="kb-topbar">
          <div>
            <div className="kb-topbar-label">{t('workspace.pageLabel')}</div>
            <div className="kb-topbar-title">{activeTabLabel}</div>
          </div>
          <div className="kb-topbar-actions">
            <div className="kb-search-pill">
              <Search size={15} />
              <span>{t('workspace.searchPlaceholder')}</span>
            </div>
            <button
              type="button"
              className="kb-primary-button"
              onClick={() => state.createBoxForActiveTab({ centerX: 720, centerY: 320 })}
              disabled={state.hasReachedBoxLimit}
            >
              <Plus size={16} />
              <span>{t('workspace.addBox')}</span>
            </button>
          </div>
        </header>

        <section className="kb-canvas-shell">
          <div className="kb-canvas-header">
            <div>
              <div className="kb-canvas-kicker">{t('workspace.canvas')}</div>
              <h2 className="kb-canvas-title">{activeTabLabel}</h2>
            </div>
            <div className="kb-canvas-meta">
              <span>{state.visibleBoxes.length} boxes</span>
              <span>{state.boxCount} total</span>
            </div>
          </div>

          <div className="kb-canvas-surface">
            <div className="kb-canvas-grid" />
            {state.visibleBoxes.length === 0 ? (
              <div className="kb-empty-state">
                <Sparkles size={20} />
                <div>
                  <div className="kb-empty-title">{state.pageEmptyLabel}</div>
                  <div className="kb-empty-copy">{t('workspace.emptyHint')}</div>
                </div>
              </div>
            ) : null}

            {state.visibleBoxes.map((box) => (
              <ManagedBox key={box.id} boxId={box.id} />
            ))}

            <SnapOverlay />
          </div>
        </section>
      </main>

      <aside className="kb-inspector">
        <div className="kb-inspector-header">
          <div className="kb-shell-section-label">{t('workspace.inspector')}</div>
          <div className="kb-inspector-title">
            {state.focusedBox
              ? getBoxTitle(state.focusedBox, t('workspace.untitledBox'))
              : t('workspace.noSelection')}
          </div>
        </div>

        <div className="kb-inspector-body">
          <WorkspaceSidebarSection title={t('workspace.selectionSummary')}>
            {state.focusedBox ? (
              <div className="kb-inspector-card">
                <div className="kb-inspector-row">
                  <span>{t('workspace.boxType')}</span>
                  <span>{state.focusedBox.templateId}</span>
                </div>
                <div className="kb-inspector-row">
                  <span>{t('workspace.layout')}</span>
                  <span>{state.focusedBox.layout}</span>
                </div>
                <div className="kb-inspector-row">
                  <span>{t('workspace.state')}</span>
                  <span>
                    {state.focusedBox.isLocked ? t('workspace.locked') : t('workspace.editable')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="kb-empty-inline">{t('workspace.inspectorEmpty')}</div>
            )}
          </WorkspaceSidebarSection>

          <WorkspaceSidebarSection title={t('workspace.focusedItem')}>
            {state.focusedItemInfo ? (
              <div className="kb-inspector-card">
                <div className="kb-inspector-row">
                  <span>Box</span>
                  <span>{state.focusedItemInfo.boxId}</span>
                </div>
                <div className="kb-inspector-row">
                  <span>Item</span>
                  <span>{state.focusedItemInfo.itemId}</span>
                </div>
              </div>
            ) : (
              <div className="kb-empty-inline">{t('workspace.focusedItemEmpty')}</div>
            )}
          </WorkspaceSidebarSection>

          <WorkspaceSidebarSection title={t('workspace.pinnedBoxes')}>
            <div className="kb-tag-list">
              {state.pinnedBoxes.length > 0 ? (
                state.pinnedBoxes.map((box) => (
                  <span key={box.id} className="kb-tag-chip">
                    {getBoxTitle(box, t('workspace.untitledBox'))}
                  </span>
                ))
              ) : (
                <div className="kb-empty-inline">{t('workspace.noPinnedBoxes')}</div>
              )}
            </div>
          </WorkspaceSidebarSection>
        </div>
      </aside>

      <SettingsPanel open={state.isSettingsOpen} onClose={state.closeSettings} />
      <ToastViewport theme={state.theme} />
    </div>
  );
}
