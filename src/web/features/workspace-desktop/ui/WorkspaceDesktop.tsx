import { AnimatePresence, motion } from 'motion/react';
import { ToastViewport } from '../../../app/presentation/ToastViewport';
import Background from '../../../widgets/DesktopShell/Background';
import BrandBadge from '../../../widgets/DesktopShell/BrandBadge';
import ManagedBox from '../../box-management';
import SettingsPanel from '../../settings';
import { useWorkspaceGlobalEvents } from '../hooks/useWorkspaceGlobalEvents';
import {
  type WorkspaceProductTabId,
  useWorkspaceDesktopState,
} from '../hooks/useWorkspaceDesktopState';
import WorkspaceCommandCenter from './WorkspaceCommandCenter';

interface WorkspaceProductTabsProps {
  tabs: Array<{ id: WorkspaceProductTabId; label: string }>;
  activeTabId: WorkspaceProductTabId;
  onSelectTab: (tabId: WorkspaceProductTabId) => void;
}

function WorkspaceProductTabs({ tabs, activeTabId, onSelectTab }: WorkspaceProductTabsProps) {
  return (
    <nav className="fixed left-1/2 top-4 z-[99991] w-[min(62rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-win-border bg-win-mica p-1 shadow-win-flyout">
      <div className="kb-scroll-hidden flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className="relative min-w-28 shrink-0 overflow-hidden rounded-xl px-3 py-2 text-sm transition-colors"
            >
              {isActive ? (
                <motion.span
                  layoutId="workspace-product-tab"
                  className="absolute inset-0 rounded-xl border border-win-border-strong bg-win-card shadow-win-card"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              ) : null}
              <span
                className={
                  isActive
                    ? 'relative z-10 block truncate text-win-text'
                    : 'relative z-10 block truncate text-win-text-secondary'
                }
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function findDataNode(attribute: string, value: string, root: ParentNode = document) {
  return Array.from(root.querySelectorAll<HTMLElement>(`[${attribute}]`)).find(
    (node) => node.getAttribute(attribute) === value,
  );
}

function revealBoxCard(boxId: string, itemId?: string) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const boxNode = findDataNode('data-kb-box-id', boxId);
      const itemNode = itemId && boxNode ? findDataNode('data-kb-item-id', itemId, boxNode) : null;

      (itemNode || boxNode)?.scrollIntoView({
        block: 'start',
        inline: 'nearest',
        behavior: 'smooth',
      });
    });
  });
}

export default function WorkspaceDesktop() {
  useWorkspaceGlobalEvents();
  const {
    brandLabel,
    clearActiveBox,
    activeTabId,
    pageEmptyLabel,
    setActiveTabId,
    tabs,
    theme,
    visibleBoxes,
  } = useWorkspaceDesktopState();

  return (
    <div
      className="kb-desktop-root relative h-full w-full overflow-hidden"
      onPointerDown={(event) => {
        if (event.currentTarget === event.target) {
          clearActiveBox();
        }
      }}
    >
      <Background camera={{ panX: 0, panY: 0 }} />
      <BrandBadge label={brandLabel} />
      <WorkspaceProductTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={(tabId) => {
          clearActiveBox();
          setActiveTabId(tabId);
        }}
      />
      <ToastViewport theme={theme} />
      <WorkspaceCommandCenter onSelectTemplatePage={setActiveTabId} onRevealBox={revealBoxCard} />

      <main className="relative z-10 h-full overflow-auto px-6 pb-8 pt-24">
        <div className="mx-auto w-[min(1440px,calc(100vw-48px))]">
          {visibleBoxes.length > 0 ? (
            <div
              className="w-full"
              style={{
                columnGap: '1rem',
                columnWidth: '22rem',
              }}
            >
              <AnimatePresence initial={false}>
                {visibleBoxes.map((box) => (
                  <ManagedBox key={box.id} boxId={box.id} placement="columns" />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="mx-auto mt-16 w-full max-w-md rounded-xl border border-dashed border-win-border bg-win-mica px-4 py-8 text-center text-sm text-win-text-secondary">
              {pageEmptyLabel}
            </div>
          )}
        </div>
      </main>

      <SettingsPanel />
    </div>
  );
}
