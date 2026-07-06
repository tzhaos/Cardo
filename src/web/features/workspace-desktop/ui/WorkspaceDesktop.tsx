import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getBoxTemplateDefinition } from '../../../../core/domains/workspace/model/boxTemplates';
import { BOX_MIN_HEIGHT, BOX_MIN_WIDTH } from '../../../../core/domains/workspace/model/workspace';
import type { WorkspaceBox } from '../../../../core/domains/workspace/model/workspace';
import { ToastViewport } from '../../../app/presentation/ToastViewport';
import { useI18n } from '../../../app/hooks/useI18n';
import Background from '../../../widgets/DesktopShell/Background';
import BrandBadge from '../../../widgets/DesktopShell/BrandBadge';
import ManagedBox from '../../box-management';
import SettingsPanel from '../../settings';
import { useWorkspaceGlobalEvents } from '../hooks/useWorkspaceGlobalEvents';
import {
  type WorkspaceProductTabId,
  useWorkspaceDesktopState,
} from '../hooks/useWorkspaceDesktopState';
import SnapOverlay from './SnapOverlay';
import WorkspaceCommandCenter from './WorkspaceCommandCenter';

const FREE_LAYOUT_GRID = 20;
const FREE_LAYOUT_GAP = 28;
const FREE_LAYOUT_MIN_HEIGHT = 860;
const COMPACT_DEFAULT_KANBAN_HEIGHT = 280;
const DEFAULT_SURFACE_WIDTH = 1440;

interface WorkspaceProductTabsProps {
  tabs: Array<{ id: WorkspaceProductTabId; label: string }>;
  activeTabId: WorkspaceProductTabId;
  createLabel: string;
  isCreateDisabled: boolean;
  onCreate: () => void;
  onSelectTab: (tabId: WorkspaceProductTabId) => void;
}

interface WorkspaceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function WorkspaceProductTabs({
  tabs,
  activeTabId,
  createLabel,
  isCreateDisabled,
  onCreate,
  onSelectTab,
}: WorkspaceProductTabsProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef(new Map<WorkspaceProductTabId, HTMLButtonElement>());
  const [activePill, setActivePill] = useState<{ left: number; width: number } | null>(null);

  const updateActivePill = useCallback(() => {
    const activeTab = tabRefs.current.get(activeTabId);

    if (!activeTab) {
      setActivePill(null);
      return;
    }

    const nextPill = {
      left: activeTab.offsetLeft + 4,
      width: Math.max(0, activeTab.offsetWidth - 8),
    };

    setActivePill((currentPill) =>
      currentPill?.left === nextPill.left && currentPill.width === nextPill.width
        ? currentPill
        : nextPill,
    );
  }, [activeTabId]);

  useLayoutEffect(() => {
    updateActivePill();

    const activeTab = tabRefs.current.get(activeTabId);
    activeTab?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(updateActivePill);
    const scroller = scrollerRef.current;

    if (scroller) {
      observer.observe(scroller);
    }

    if (activeTab) {
      observer.observe(activeTab);
    }

    return () => observer.disconnect();
  }, [activeTabId, tabs, updateActivePill]);

  return (
    <nav className="kb-product-tabs fixed left-1/2 top-4 z-[99991] flex h-12 w-[min(42rem,calc(100vw-34rem))] min-w-[26rem] -translate-x-1/2 items-center overflow-hidden rounded-full px-2 max-[980px]:w-[calc(100vw-3rem)] max-[980px]:min-w-0">
      <div ref={scrollerRef} className="kb-scroll-hidden h-full min-w-0 flex-1 overflow-x-auto">
        <div className="relative flex h-full min-w-max">
          {activePill ? (
            <motion.span
              className="kb-product-tab-active pointer-events-none absolute inset-y-1 left-0 rounded-full"
              initial={false}
              animate={{ x: activePill.left, width: activePill.width }}
              transition={{ type: 'spring', stiffness: 280, damping: 32, mass: 0.72 }}
            />
          ) : null}

          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;

            return (
              <button
                key={tab.id}
                ref={(node) => {
                  if (node) {
                    tabRefs.current.set(tab.id, node);
                  } else {
                    tabRefs.current.delete(tab.id);
                  }
                }}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className="relative z-10 min-w-24 shrink-0 overflow-hidden px-4 text-sm transition-colors"
              >
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
      </div>
      <div className="kb-capsule-divider mx-2 h-6 w-px shrink-0" />
      <button
        type="button"
        onClick={onCreate}
        disabled={isCreateDisabled}
        title={createLabel}
        aria-label={createLabel}
        className="kb-capsule-action flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <Plus size={17} />
      </button>
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
        block: 'center',
        inline: 'center',
        behavior: 'smooth',
      });
    });
  });
}

function roundToGrid(value: number) {
  return Math.max(0, Math.round(value / FREE_LAYOUT_GRID) * FREE_LAYOUT_GRID);
}

function isLegacyMasonrySlot(box: WorkspaceBox) {
  return (
    Number.isInteger(box.bounds.x) &&
    Number.isInteger(box.bounds.y) &&
    box.bounds.x >= 0 &&
    box.bounds.x < 8 &&
    box.bounds.y >= 0 &&
    box.bounds.y < 80
  );
}

function isOversizedDefaultKanbanBox(box: WorkspaceBox) {
  return (
    box.templateId === 'kanban' &&
    box.id.startsWith('default-kanban') &&
    box.bounds.height > COMPACT_DEFAULT_KANBAN_HEIGHT + FREE_LAYOUT_GRID
  );
}

function resolveFreeLayoutColumnCount(width: number) {
  if (width < 720) {
    return 1;
  }

  if (width < 1100) {
    return 2;
  }

  return 3;
}

function getDefaultFreePositions(boxes: WorkspaceBox[], surfaceWidth: number) {
  const columnCount = resolveFreeLayoutColumnCount(surfaceWidth);
  const gutter = FREE_LAYOUT_GAP;
  const usableWidth = Math.max(BOX_MIN_WIDTH, surfaceWidth - gutter * 2);
  const columnWidth = (usableWidth - gutter * (columnCount - 1)) / columnCount;
  const columnHeights = Array.from({ length: columnCount }, () => gutter);
  const positions = new Map<string, { x: number; y: number }>();

  boxes.forEach((box, index) => {
    const preferredColumn = index % columnCount;
    const shortestHeight = Math.min(...columnHeights);
    const columnIndex =
      columnHeights[preferredColumn] <= shortestHeight + FREE_LAYOUT_GRID
        ? preferredColumn
        : columnHeights.indexOf(shortestHeight);
    const x =
      gutter +
      columnIndex * (columnWidth + gutter) +
      Math.max(0, columnWidth - box.bounds.width) / 2;
    const y = columnHeights[columnIndex];

    positions.set(box.id, {
      x: roundToGrid(x),
      y: roundToGrid(y),
    });
    columnHeights[columnIndex] = y + Math.max(BOX_MIN_HEIGHT, box.bounds.height) + gutter;
  });

  return positions;
}

function rectsHaveGapConflict(first: WorkspaceRect, second: WorkspaceRect) {
  return !(
    first.x + first.width + FREE_LAYOUT_GAP <= second.x ||
    second.x + second.width + FREE_LAYOUT_GAP <= first.x ||
    first.y + first.height + FREE_LAYOUT_GAP <= second.y ||
    second.y + second.height + FREE_LAYOUT_GAP <= first.y
  );
}

function findOpenFreePosition(
  boxes: WorkspaceBox[],
  surfaceWidth: number,
  size: Pick<WorkspaceRect, 'height' | 'width'>,
) {
  const safeWidth = Math.max(BOX_MIN_WIDTH, size.width);
  const safeHeight = Math.max(BOX_MIN_HEIGHT, size.height);
  const step = FREE_LAYOUT_GRID;
  const maxX = Math.max(FREE_LAYOUT_GAP, surfaceWidth - safeWidth - FREE_LAYOUT_GAP);
  const placedRects = boxes.map((box) => box.bounds);

  for (let y = FREE_LAYOUT_GAP; y < FREE_LAYOUT_MIN_HEIGHT * 3; y += step) {
    for (let x = FREE_LAYOUT_GAP; x <= maxX; x += step) {
      const candidate = { x, y, width: safeWidth, height: safeHeight };

      if (!placedRects.some((rect) => rectsHaveGapConflict(candidate, rect))) {
        return { x, y };
      }
    }
  }

  return {
    x: FREE_LAYOUT_GAP,
    y: Math.max(
      FREE_LAYOUT_GAP,
      ...placedRects.map((rect) => rect.y + rect.height + FREE_LAYOUT_GAP),
    ),
  };
}

function useElementWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_SURFACE_WIDTH;
    }

    return Math.min(DEFAULT_SURFACE_WIDTH, Math.max(BOX_MIN_WIDTH, window.innerWidth - 48));
  });

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const updateWidth = () => setWidth(element.getBoundingClientRect().width);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

export default function WorkspaceDesktop() {
  useWorkspaceGlobalEvents();
  const { t } = useI18n();
  const {
    brandLabel,
    clearActiveBox,
    activeTabId,
    createBoxForActiveTab,
    dispatch,
    pageEmptyLabel,
    setActiveTabId,
    tabs,
    theme,
    visibleBoxes,
    hasReachedBoxLimit,
  } = useWorkspaceDesktopState();
  const { ref: surfaceRef, width: surfaceWidth } = useElementWidth();
  const repairedPagesRef = useRef(new Set<string>());
  const activeTemplate = getBoxTemplateDefinition(activeTabId);
  const createBoxLabel = t('workspace.createPageBox', {
    template: t(activeTemplate.titleKey),
  });
  const canvasHeight = useMemo(
    () =>
      Math.max(
        FREE_LAYOUT_MIN_HEIGHT,
        ...visibleBoxes.map((box) => box.bounds.y + box.bounds.height + FREE_LAYOUT_GAP),
      ),
    [visibleBoxes],
  );

  useEffect(() => {
    const oversizedDefaultKanbanBoxes = visibleBoxes.filter(isOversizedDefaultKanbanBox);

    if (oversizedDefaultKanbanBoxes.length > 0) {
      const oversizedDefaultKanbanIds = new Set(oversizedDefaultKanbanBoxes.map((box) => box.id));
      const compactBoxes = visibleBoxes.map((box) =>
        isOversizedDefaultKanbanBox(box)
          ? {
              ...box,
              bounds: {
                ...box.bounds,
                height: COMPACT_DEFAULT_KANBAN_HEIGHT,
              },
            }
          : box,
      );
      const defaultPositions = getDefaultFreePositions(compactBoxes, surfaceWidth);

      compactBoxes.forEach((box) => {
        if (!oversizedDefaultKanbanIds.has(box.id)) {
          return;
        }

        const defaultPosition = defaultPositions.get(box.id);

        dispatch({
          type: 'box.update',
          boxId: box.id,
          updates: {
            bounds: {
              height: COMPACT_DEFAULT_KANBAN_HEIGHT,
              ...(defaultPosition ?? {}),
            },
          },
        });
      });
      return;
    }

    const legacyBoxes = visibleBoxes.filter(isLegacyMasonrySlot);

    if (legacyBoxes.length > 0) {
      const defaultPositions = getDefaultFreePositions(visibleBoxes, surfaceWidth);

      visibleBoxes.forEach((box) => {
        if (!isLegacyMasonrySlot(box)) {
          return;
        }

        const defaultPosition = defaultPositions.get(box.id);

        if (!defaultPosition) {
          return;
        }

        dispatch({
          type: 'box.update',
          boxId: box.id,
          updates: {
            bounds: defaultPosition,
          },
        });
      });
      return;
    }

    const repairKey = `${activeTabId}:${Math.round(surfaceWidth)}`;

    if (repairedPagesRef.current.has(repairKey)) {
      return;
    }

    repairedPagesRef.current.add(repairKey);
    const placedBoxes: WorkspaceBox[] = [];

    visibleBoxes.forEach((box) => {
      const hasConflict = placedBoxes.some((placedBox) =>
        rectsHaveGapConflict(box.bounds, placedBox.bounds),
      );
      const isOutsideSurface = box.bounds.x + box.bounds.width + FREE_LAYOUT_GAP > surfaceWidth;

      if (!hasConflict && !isOutsideSurface) {
        placedBoxes.push(box);
        return;
      }

      const position = findOpenFreePosition(placedBoxes, surfaceWidth, box.bounds);
      const repairedBox = {
        ...box,
        bounds: {
          ...box.bounds,
          ...position,
        },
      };

      placedBoxes.push(repairedBox);
      dispatch({
        type: 'box.update',
        boxId: box.id,
        updates: {
          bounds: position,
        },
      });
    });
  }, [activeTabId, dispatch, surfaceWidth, visibleBoxes]);

  const handleCreatePageBox = useCallback(() => {
    if (hasReachedBoxLimit) {
      return;
    }

    const result = createBoxForActiveTab({
      centerX: surfaceWidth / 2,
      centerY: 260,
    });

    if (result.status !== 'created') {
      return;
    }

    const position = findOpenFreePosition(visibleBoxes, surfaceWidth, result.box.bounds);
    dispatch({
      type: 'box.update',
      boxId: result.box.id,
      updates: {
        bounds: position,
      },
    });
    revealBoxCard(result.box.id, result.initialFocusItemId ?? undefined);
  }, [createBoxForActiveTab, dispatch, hasReachedBoxLimit, surfaceWidth, visibleBoxes]);

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
        createLabel={createBoxLabel}
        isCreateDisabled={hasReachedBoxLimit}
        onCreate={handleCreatePageBox}
        onSelectTab={(tabId) => {
          clearActiveBox();
          setActiveTabId(tabId);
        }}
      />
      <ToastViewport theme={theme} />
      <WorkspaceCommandCenter onSelectTemplatePage={setActiveTabId} onRevealBox={revealBoxCard} />

      <main className="relative z-10 h-full overflow-hidden px-6 pb-6 pt-28">
        <div
          ref={surfaceRef}
          className="kb-free-workspace mx-auto w-[min(1500px,calc(100vw-3rem))]"
          onPointerDown={(event) => {
            if (event.currentTarget === event.target) {
              clearActiveBox();
            }
          }}
        >
          <LayoutGroup id={`workspace-page-${activeTabId}`}>
            <div className="kb-free-canvas relative" style={{ minHeight: canvasHeight }}>
              <SnapOverlay />
              <AnimatePresence initial={false}>
                {visibleBoxes.map((box) => (
                  <ManagedBox key={box.id} boxId={box.id} placement="canvas" />
                ))}
              </AnimatePresence>

              {visibleBoxes.length === 0 ? (
                <button
                  type="button"
                  className="kb-empty-create absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition active:scale-95"
                  title={pageEmptyLabel}
                  aria-label={createBoxLabel}
                  onClick={handleCreatePageBox}
                >
                  <Plus size={20} />
                </button>
              ) : null}
            </div>
          </LayoutGroup>
        </div>
      </main>

      <SettingsPanel />
    </div>
  );
}
