import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { getBoxDisplayTitle } from '../../../../core/domains/workspace/model/boxTitles';
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
import WorkspaceCommandCenter from './WorkspaceCommandCenter';

const MASONRY_GAP = 16;
const DEFAULT_MASONRY_WIDTH = 1440;

const TEMPLATE_COLUMN_CAPS: Record<WorkspaceProductTabId, number> = {
  kanban: 4,
  collection: 3,
  launcher: 4,
  inbox: 3,
  'project-board': 3,
  'daily-desk': 3,
  'web-library': 3,
  'frequent-sites': 4,
  'reading-list': 3,
};

interface WorkspaceProductTabsProps {
  tabs: Array<{ id: WorkspaceProductTabId; label: string }>;
  activeTabId: WorkspaceProductTabId;
  onSelectTab: (tabId: WorkspaceProductTabId) => void;
}

interface MasonryDragState {
  boxId: string;
  columns: string[][];
  pointerX: number;
  pointerY: number;
  previewWidth: number;
  previewHeight: number;
  title: string;
  tabId: WorkspaceProductTabId;
}

function WorkspaceProductTabs({ tabs, activeTabId, onSelectTab }: WorkspaceProductTabsProps) {
  return (
    <nav className="kb-product-tabs fixed left-1/2 top-4 z-[99991] w-[min(64rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl p-1">
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
                  className="kb-product-tab-active absolute inset-0 rounded-xl"
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

function resolveMasonryColumnCount(tabId: WorkspaceProductTabId, width: number) {
  const columnCap = TEMPLATE_COLUMN_CAPS[tabId] ?? 3;

  if (width < 620) {
    return 1;
  }

  if (width < 980) {
    return Math.min(2, columnCap);
  }

  if (width < 1320) {
    return Math.min(3, columnCap);
  }

  return columnCap;
}

function isStoredMasonrySlot(box: WorkspaceBox, columnCount: number) {
  return (
    Number.isInteger(box.bounds.x) &&
    Number.isInteger(box.bounds.y) &&
    box.bounds.x >= 0 &&
    box.bounds.x < columnCount &&
    box.bounds.y >= 0 &&
    box.bounds.y < 1000
  );
}

function createEmptyColumns(columnCount: number) {
  return Array.from({ length: columnCount }, () => [] as string[]);
}

function createMasonryColumns(boxes: WorkspaceBox[], columnCount: number) {
  const columns = Array.from({ length: columnCount }, () => {
    return [] as Array<{ box: WorkspaceBox; orderIndex: number; sourceIndex: number }>;
  });
  const unslotted: Array<{ box: WorkspaceBox; sourceIndex: number }> = [];

  boxes.forEach((box, sourceIndex) => {
    if (!isStoredMasonrySlot(box, columnCount)) {
      unslotted.push({ box, sourceIndex });
      return;
    }

    columns[box.bounds.x].push({
      box,
      orderIndex: box.bounds.y,
      sourceIndex,
    });
  });

  columns.forEach((column) => {
    column.sort(
      (first, second) =>
        first.orderIndex - second.orderIndex || first.sourceIndex - second.sourceIndex,
    );
  });

  const columnHeights = columns.map((column) =>
    column.reduce((height, entry) => height + entry.box.bounds.height + MASONRY_GAP, 0),
  );

  for (const entry of unslotted) {
    const shortestHeight = Math.min(...columnHeights);
    const columnIndex = Math.max(0, columnHeights.indexOf(shortestHeight));
    columns[columnIndex].push({
      box: entry.box,
      orderIndex: columns[columnIndex].length,
      sourceIndex: entry.sourceIndex,
    });
    columnHeights[columnIndex] += entry.box.bounds.height + MASONRY_GAP;
  }

  return columns.map((column) => column.map((entry) => entry.box.id));
}

function moveBoxIdToSlot(
  columns: string[][],
  boxId: string,
  targetColumnIndex: number,
  targetIndex: number,
) {
  let foundBox = false;
  const nextColumns = columns.map((column) =>
    column.filter((candidateId) => {
      const shouldKeep = candidateId !== boxId;
      foundBox ||= !shouldKeep;
      return shouldKeep;
    }),
  );

  if (!foundBox || nextColumns.length === 0) {
    return columns;
  }

  const safeColumnIndex = Math.min(Math.max(targetColumnIndex, 0), nextColumns.length - 1);
  const safeTargetIndex = Math.min(Math.max(targetIndex, 0), nextColumns[safeColumnIndex].length);
  nextColumns[safeColumnIndex].splice(safeTargetIndex, 0, boxId);

  return nextColumns;
}

function areColumnsEqual(firstColumns: string[][], secondColumns: string[][]) {
  if (firstColumns.length !== secondColumns.length) {
    return false;
  }

  return firstColumns.every(
    (column, columnIndex) =>
      column.length === secondColumns[columnIndex].length &&
      column.every((boxId, boxIndex) => boxId === secondColumns[columnIndex][boxIndex]),
  );
}

function getDropColumnIndex(clientX: number, columnNodes: Array<HTMLDivElement | null>) {
  const columnRects = columnNodes
    .map((node, columnIndex) => ({
      columnIndex,
      rect: node?.getBoundingClientRect() ?? null,
    }))
    .filter((entry): entry is { columnIndex: number; rect: DOMRect } => Boolean(entry.rect));

  if (columnRects.length === 0) {
    return 0;
  }

  const containingColumn = columnRects.find(
    ({ rect }) => clientX >= rect.left && clientX <= rect.right,
  );

  if (containingColumn) {
    return containingColumn.columnIndex;
  }

  return columnRects.reduce((closest, candidate) => {
    const closestCenter = closest.rect.left + closest.rect.width / 2;
    const candidateCenter = candidate.rect.left + candidate.rect.width / 2;

    return Math.abs(candidateCenter - clientX) < Math.abs(closestCenter - clientX)
      ? candidate
      : closest;
  }).columnIndex;
}

function getDropTarget(
  clientX: number,
  clientY: number,
  columns: string[][],
  boxId: string,
  columnNodes: Array<HTMLDivElement | null>,
) {
  const columnIndex = getDropColumnIndex(clientX, columnNodes);
  const targetColumn = columns[columnIndex]?.filter((candidateId) => candidateId !== boxId) ?? [];
  let targetIndex = targetColumn.length;
  const columnNode = columnNodes[columnIndex];

  if (!columnNode) {
    return { columnIndex, targetIndex };
  }

  for (const [index, candidateId] of targetColumn.entries()) {
    const candidateNode = findDataNode('data-kb-box-id', candidateId, columnNode);

    if (!candidateNode) {
      continue;
    }

    const rect = candidateNode.getBoundingClientRect();

    if (clientY < rect.top + rect.height / 2) {
      targetIndex = index;
      break;
    }
  }

  return { columnIndex, targetIndex };
}

function useElementWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(DEFAULT_MASONRY_WIDTH);

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
    dispatch,
    pageEmptyLabel,
    setActiveTabId,
    tabs,
    theme,
    visibleBoxes,
  } = useWorkspaceDesktopState();
  const { ref: masonryRef, width: masonryWidth } = useElementWidth();
  const columnRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [dragState, setDragState] = useState<MasonryDragState | null>(null);
  const columnCount = resolveMasonryColumnCount(activeTabId, masonryWidth);
  const baseColumns = useMemo(
    () => createMasonryColumns(visibleBoxes, columnCount),
    [columnCount, visibleBoxes],
  );
  const displayedColumns =
    dragState && dragState.tabId === activeTabId ? dragState.columns : baseColumns;
  const boxesById = useMemo(
    () => new Map(visibleBoxes.map((box) => [box.id, box])),
    [visibleBoxes],
  );

  useEffect(() => {
    columnRefs.current = columnRefs.current.slice(0, columnCount);
  }, [columnCount]);

  const persistMasonryColumns = useCallback(
    (columns: string[][]) => {
      dispatch({
        type: 'box.layoutPage',
        positions: columns.flatMap((column, columnIndex) =>
          column.map((boxId, orderIndex) => ({
            boxId,
            columnIndex,
            orderIndex,
          })),
        ),
      });
    },
    [dispatch],
  );

  const handleMasonryDragStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, box: WorkspaceBox) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.button !== 0 || !event.isPrimary || box.isLocked) {
        return;
      }

      const sourceNode = findDataNode('data-kb-box-id', box.id);
      const sourceRect = sourceNode?.getBoundingClientRect();
      const initialColumns = dragState?.tabId === activeTabId ? dragState.columns : baseColumns;

      setDragState({
        boxId: box.id,
        columns: initialColumns.length > 0 ? initialColumns : createEmptyColumns(columnCount),
        pointerX: event.clientX,
        pointerY: event.clientY,
        previewWidth: sourceRect?.width ?? box.bounds.width,
        previewHeight: sourceRect?.height ?? box.bounds.height,
        title: getBoxDisplayTitle(box, t),
        tabId: activeTabId,
      });

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== event.pointerId) {
          return;
        }

        setDragState((current) => {
          if (!current || current.boxId !== box.id) {
            return current;
          }

          const target = getDropTarget(
            moveEvent.clientX,
            moveEvent.clientY,
            current.columns,
            box.id,
            columnRefs.current,
          );
          const nextColumns = moveBoxIdToSlot(
            current.columns,
            box.id,
            target.columnIndex,
            target.targetIndex,
          );

          return {
            ...current,
            columns: areColumnsEqual(current.columns, nextColumns) ? current.columns : nextColumns,
            pointerX: moveEvent.clientX,
            pointerY: moveEvent.clientY,
          };
        });
      };

      const finishDrag = (finishEvent: PointerEvent) => {
        if (finishEvent.pointerId !== event.pointerId) {
          return;
        }

        cleanup();
        setDragState((current) => {
          if (current?.boxId === box.id) {
            persistMasonryColumns(current.columns);
          }

          return null;
        });
      };

      const cancelDrag = () => {
        cleanup();
        setDragState(null);
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handlePointerMove, true);
        window.removeEventListener('pointerup', finishDrag, true);
        window.removeEventListener('pointercancel', cancelDrag, true);
        window.removeEventListener('blur', cancelDrag);
      };

      window.addEventListener('pointermove', handlePointerMove, true);
      window.addEventListener('pointerup', finishDrag, true);
      window.addEventListener('pointercancel', cancelDrag, true);
      window.addEventListener('blur', cancelDrag);
    },
    [activeTabId, baseColumns, columnCount, dragState, persistMasonryColumns, t],
  );

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
          setDragState(null);
          clearActiveBox();
          setActiveTabId(tabId);
        }}
      />
      <ToastViewport theme={theme} />
      <WorkspaceCommandCenter onSelectTemplatePage={setActiveTabId} onRevealBox={revealBoxCard} />

      <main className="relative z-10 h-full overflow-auto px-5 pb-10 pt-24">
        <div ref={masonryRef} className="mx-auto w-[min(1500px,calc(100vw-40px))]">
          {visibleBoxes.length > 0 ? (
            <LayoutGroup id={`workspace-page-${activeTabId}`}>
              <div
                className="kb-masonry-board grid items-start"
                style={{
                  gap: `${MASONRY_GAP}px`,
                  gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                }}
              >
                {displayedColumns.map((column, columnIndex) => (
                  <div
                    key={`${activeTabId}:${columnIndex}`}
                    ref={(node) => {
                      columnRefs.current[columnIndex] = node;
                    }}
                    className="kb-masonry-column flex min-w-0 flex-col items-start"
                    style={{ gap: `${MASONRY_GAP}px` }}
                    data-kb-masonry-column={columnIndex}
                  >
                    <AnimatePresence initial={false}>
                      {column.map((boxId) => {
                        const box = boxesById.get(boxId);

                        return box ? (
                          <ManagedBox
                            key={box.id}
                            boxId={box.id}
                            placement="columns"
                            isMasonryDragging={dragState?.boxId === box.id}
                            onMasonryDragStart={handleMasonryDragStart}
                          />
                        ) : null;
                      })}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </LayoutGroup>
          ) : (
            <div className="kb-empty-page mx-auto mt-16 w-full max-w-md rounded-xl px-4 py-8 text-center text-sm text-win-text-secondary">
              {pageEmptyLabel}
            </div>
          )}
        </div>
      </main>

      {dragState ? (
        <div
          className="kb-drag-preview pointer-events-none fixed z-[99994] flex items-start rounded-xl px-3 py-3 text-sm font-semibold text-win-text"
          style={{
            left: dragState.pointerX + 14,
            top: dragState.pointerY + 14,
            width: dragState.previewWidth,
            minHeight: Math.min(dragState.previewHeight, 180),
            maxWidth: 'min(24rem, calc(100vw - 2rem))',
          }}
        >
          <span className="truncate">{dragState.title}</span>
        </div>
      ) : null}

      <SettingsPanel />
    </div>
  );
}
