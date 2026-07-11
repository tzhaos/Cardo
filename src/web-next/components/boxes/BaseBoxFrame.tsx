import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import {
  ChevronsDownUp,
  ChevronsUpDown,
  LayoutGrid,
  List,
  Lock,
  PackageCheck,
  Plus,
  SquarePen,
  Star,
  StarOff,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { animate as animateMotion, motion, useMotionValue, useSpring } from 'motion/react';
import type { MotionStyle } from 'motion/react';
import {
  RECYCLE_BIN_PAGE_ID,
  isRecycleBinPageId,
  type WorkspaceBox,
  type WorkspaceBoxIcon,
} from '../../domain/workspace';
import { useCanvasStore } from '../../app/stores/canvasStore';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { useInlineRename } from '../../app/useInlineRename';
import { getPageDropElement, registerBoxElement } from '../../app/interactionElementRegistry';
import {
  constrainBoxFrameToCanvas,
  constrainBoxResizeToCanvas,
  createCanvasWorldBounds,
} from '../../domain/canvasGeometry';
import {
  startWindowPointerSession,
  type WindowPointerSession,
} from '../../app/windowPointerSession';
import { useContextMenu } from '../../ui/khaos/context-menu';
import { useI18n } from '../../i18n/useI18n';
import { BoxAppearanceView } from './BoxAppearancePopover';
import { Input } from '../../ui/primitives/input';
import { Button } from '../../ui/primitives/button';
import { MotionButton } from '../../ui/primitives/motion-button';

interface BaseBoxFrameProps {
  box: WorkspaceBox;
  icon: ReactNode;
  iconId: WorkspaceBoxIcon;
  accent: string;
  children: ReactNode;
  onAddItem: () => void;
  skipEntryAnimation?: boolean;
}

interface BoxDeleteMotion {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  borderRadius: number;
  permanent: boolean;
}

export function BaseBoxFrame({
  box,
  icon,
  iconId,
  accent,
  children,
  onAddItem,
  skipEntryAnimation = false,
}: BaseBoxFrameProps) {
  const updateBoxFrame = useWorkspaceStore((state) => state.updateBoxFrame);
  const renameBox = useWorkspaceStore((state) => state.renameBox);
  const promoteTemporaryBox = useWorkspaceStore((state) => state.promoteTemporaryBox);
  const setBoxDetailMode = useWorkspaceStore((state) => state.setBoxDetailMode);
  const setBoxLocked = useWorkspaceStore((state) => state.setBoxLocked);
  const setBoxViewMode = useWorkspaceStore((state) => state.setBoxViewMode);
  const deleteBox = useWorkspaceStore((state) => state.deleteBox);
  const addBoxToCollection = useWorkspaceStore((state) => state.addBoxToCollection);
  const removeBoxFromCollection = useWorkspaceStore((state) => state.removeBoxFromCollection);
  const beginBoxDrag = useUiStore((state) => state.beginBoxDrag);
  const endBoxDrag = useUiStore((state) => state.endBoxDrag);
  const draggedBoxId = useUiStore((state) => state.draggedBoxId);
  const boxDragOverTopBar = useUiStore((state) => state.boxDragOverTopBar);
  const boxDropPageId = useUiStore((state) => state.boxDropPageId);
  const boxDropRelease = useUiStore((state) => state.boxDropRelease);
  const selectedBoxId = useUiStore((state) => state.selectedBoxId);
  const highlightedBoxId = useUiStore((state) => state.highlightedBoxId);
  const selectBox = useUiStore((state) => state.selectBox);
  const addViewState = useUiStore((state) => state.addDrafts[box.id]);
  const closeAddView = useUiStore((state) => state.closeAddView);
  const contextMenu = useContextMenu();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [appearanceView, setAppearanceView] = useState(false);
  const [deleteMotion, setDeleteMotion] = useState<BoxDeleteMotion | null>(null);
  const [dragTransformOrigin, setDragTransformOrigin] = useState(
    boxDropRelease?.boxId === box.id ? boxDropRelease.entryTransformOrigin : '50% 50%',
  );
  const [dropLandingStarted, setDropLandingStarted] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const setArticleElement = useCallback(
    (element: HTMLElement | null) => {
      articleRef.current = element;
      registerBoxElement(box.id, element);
    },
    [box.id],
  );
  const pointerSessionRef = useRef<WindowPointerSession | null>(null);
  const deleteTargetRef = useRef<HTMLElement | null>(null);
  const deleteCommittedRef = useRef(false);
  const initialDropFrame = boxDropRelease?.boxId === box.id ? boxDropRelease.entryFrame : box.frame;
  const boxLeft = useMotionValue(initialDropFrame.x);
  const boxTop = useMotionValue(initialDropFrame.y);
  const boxWidth = useMotionValue(box.frame.width);
  const boxHeight = useMotionValue(box.frame.height);
  const dragTiltTarget = useMotionValue(0);
  const dragTilt = useSpring(dragTiltTarget, { stiffness: 320, damping: 26, mass: 0.45 });
  const { t } = useI18n();
  const titleRename = useInlineRename({
    value: box.title,
    onCommit: (title) => renameBox(box.id, title),
  });

  useEffect(
    () => () => {
      pointerSessionRef.current?.end();
      deleteTargetRef.current?.classList.remove('wbn-box-drop-target');
    },
    [],
  );

  const beginDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (box.isLocked) {
      return;
    }

    if ((event.target as HTMLElement).closest('button,input,textarea,select,[data-no-drag]')) {
      return;
    }

    event.preventDefault();
    setAppearanceView(false);
    contextMenu.closeMenu();
    pointerSessionRef.current?.end();
    beginBoxDrag(box.id);
    const boxElement = event.currentTarget.closest<HTMLElement>('[data-canvas-box]');
    const boxRect = boxElement?.getBoundingClientRect();
    if (boxRect) {
      const originX = Math.max(
        0,
        Math.min(100, ((event.clientX - boxRect.left) / boxRect.width) * 100),
      );
      const originY = Math.max(
        0,
        Math.min(100, ((event.clientY - boxRect.top) / boxRect.height) * 100),
      );
      setDragTransformOrigin(`${originX}% ${originY}%`);
    }
    const startX = event.clientX;
    const startY = event.clientY;
    const startFrame = box.frame;
    let latestFrame = startFrame;
    const session = startWindowPointerSession({
      pointerId: event.pointerId,
      onMove: (moveEvent) => {
        dragTiltTarget.set(Math.max(-2.2, Math.min(2.2, (moveEvent.clientX - startX) / 180)));
        latestFrame = constrainBoxFrameToCanvas(
          {
            ...startFrame,
            x: Math.round(startFrame.x + moveEvent.clientX - startX),
            y: Math.round(startFrame.y + moveEvent.clientY - startY),
          },
          createCanvasWorldBounds(useCanvasStore.getState().viewportSize),
        );
        boxLeft.set(latestFrame.x);
        boxTop.set(latestFrame.y);
      },
      onEnd: (reason) => {
        dragTiltTarget.set(0);
        const droppingOnTopBar = useUiStore.getState().boxDragOverTopBar;
        if (!droppingOnTopBar) {
          updateBoxFrame(box.id, latestFrame);
        }
        if (pointerSessionRef.current === session) {
          pointerSessionRef.current = null;
        }
        if (reason === 'pointerup') {
          window.setTimeout(endBoxDrag, 0);
        } else {
          endBoxDrag();
        }
      },
    });
    pointerSessionRef.current = session;
  };

  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (box.isLocked) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();
    contextMenu.closeMenu();
    pointerSessionRef.current?.end();
    const startX = event.clientX;
    const startY = event.clientY;
    const startFrame = box.frame;
    let latestFrame = startFrame;
    const session = startWindowPointerSession({
      pointerId: event.pointerId,
      onMove: (moveEvent) => {
        latestFrame = constrainBoxResizeToCanvas(
          {
            ...startFrame,
            width: Math.max(240, Math.round(startFrame.width + moveEvent.clientX - startX)),
            height: Math.max(170, Math.round(startFrame.height + moveEvent.clientY - startY)),
          },
          createCanvasWorldBounds(useCanvasStore.getState().viewportSize),
          { width: 240, height: 170 },
        );
        boxWidth.set(latestFrame.width);
        boxHeight.set(latestFrame.height);
      },
      onEnd: () => {
        updateBoxFrame(box.id, latestFrame);
        if (pointerSessionRef.current === session) {
          pointerSessionRef.current = null;
        }
      },
    });
    pointerSessionRef.current = session;
  };

  const dragging = draggedBoxId === box.id;
  const draggingOverTopBar = dragging && boxDragOverTopBar;
  const draggingOverTab = draggingOverTopBar && boxDropPageId !== null;
  const dropReleased = boxDropRelease?.boxId === box.id && boxDropRelease.pageId === box.pageId;
  const compactScale = Math.max(0.22, Math.min(0.46, 136 / box.frame.width, 86 / box.frame.height));
  const isInRecycleBin = isRecycleBinPageId(box.pageId);
  const isCollected = useWorkspaceStore((state) =>
    state.projection.collectionBoxIds.includes(box.id),
  );
  const isTemporary = box.kind === 'temporary';
  const viewMode = isTemporary ? 'list' : box.viewMode;
  const detailMode = isTemporary ? 'detailed' : box.detailMode;
  const visualScale =
    dropReleased && !dropLandingStarted
      ? (boxDropRelease?.entryScale ?? compactScale)
      : draggingOverTopBar
        ? compactScale * (draggingOverTab ? 0.9 : 1)
        : dragging
          ? 1.028
          : 1;
  const visualClassName = [
    'wbn-box',
    dragging || deleteMotion ? 'wbn-box-dragging' : '',
    draggingOverTopBar || (deleteMotion && !deleteMotion.permanent) ? 'wbn-box-dragging-bar' : '',
    draggingOverTab || (deleteMotion && !deleteMotion.permanent) ? 'wbn-box-dragging-tab' : '',
    deleteMotion ? 'wbn-box-delete-exiting' : '',
    dropReleased ? 'wbn-box-drop-released' : '',
    selectedBoxId === box.id ? 'wbn-box-selected' : '',
    highlightedBoxId === box.id ? 'wbn-box-highlighted' : '',
    detailMode === 'compact' ? 'wbn-box-compact' : '',
    box.isLocked ? 'wbn-box-locked' : '',
    isTemporary ? 'wbn-box-temporary' : '',
    addViewState?.mode || appearanceView || confirmDelete ? 'wbn-box-local-view' : '',
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    boxWidth.set(box.frame.width);
    boxHeight.set(box.frame.height);
    if (dragging) {
      return;
    }

    const positionTransition = dropReleased
      ? { type: 'spring' as const, damping: 24, stiffness: 150, mass: 1.05 }
      : { type: 'spring' as const, damping: 28, stiffness: 260 };
    let leftAnimation: ReturnType<typeof animateMotion> | undefined;
    let topAnimation: ReturnType<typeof animateMotion> | undefined;
    const startLanding = () => {
      if (dropReleased) setDropLandingStarted(true);
      leftAnimation = animateMotion(boxLeft, box.frame.x, positionTransition);
      topAnimation = animateMotion(boxTop, box.frame.y, positionTransition);
    };
    const delayId = dropReleased ? window.setTimeout(startLanding, 220) : null;
    if (!dropReleased) {
      startLanding();
    }
    return () => {
      if (delayId !== null) window.clearTimeout(delayId);
      leftAnimation?.stop();
      topAnimation?.stop();
    };
  }, [
    box.frame.height,
    box.frame.width,
    box.frame.x,
    box.frame.y,
    boxHeight,
    boxLeft,
    boxTop,
    boxWidth,
    dragging,
    dropReleased,
  ]);

  const startDeleteMotion = () => {
    if (deleteMotion || deleteCommittedRef.current) return;

    pointerSessionRef.current?.end();
    endBoxDrag();
    const boxRect = articleRef.current?.getBoundingClientRect();
    if (isInRecycleBin || !boxRect) {
      setDeleteMotion({
        x: 0,
        y: 8,
        scale: 0.82,
        opacity: 0,
        borderRadius: 16,
        permanent: true,
      });
      return;
    }

    const target = getPageDropElement(RECYCLE_BIN_PAGE_ID);
    const targetRect = target?.getBoundingClientRect();
    if (target) {
      deleteTargetRef.current = target;
      target.classList.add('wbn-box-drop-target');
    }
    setDeleteMotion({
      x: targetRect
        ? targetRect.left + targetRect.width / 2 - (boxRect.left + boxRect.width / 2)
        : 0,
      y: targetRect
        ? targetRect.top + targetRect.height / 2 - (boxRect.top + boxRect.height / 2)
        : 8,
      scale: compactScale * 0.9,
      opacity: targetRect ? 0.18 : 0,
      borderRadius: 24,
      permanent: false,
    });
  };

  const finishDeleteMotion = () => {
    if (!deleteMotion || deleteCommittedRef.current) return;

    deleteCommittedRef.current = true;
    const target = deleteTargetRef.current;
    deleteTargetRef.current = null;
    if (target) {
      target.classList.remove('wbn-box-drop-target');
      target.classList.add('wbn-box-drop-released');
      window.setTimeout(() => target.classList.remove('wbn-box-drop-released'), 560);
    }
    deleteBox(box.id);
  };

  return (
    <motion.article
      ref={setArticleElement}
      className={visualClassName}
      data-canvas-box
      data-box-id={box.id}
      initial={skipEntryAnimation ? false : { scale: 0.8, opacity: 0 }}
      animate={{
        x: deleteMotion?.x ?? 0,
        y: deleteMotion?.y ?? (dragging && !draggingOverTopBar ? -7 : 0),
        scale: deleteMotion?.scale ?? visualScale,
        opacity: deleteMotion?.opacity ?? (draggingOverTopBar ? 0.94 : dragging ? 0.97 : 1),
        borderRadius: deleteMotion?.borderRadius ?? (draggingOverTopBar ? 24 : 16),
      }}
      transition={
        deleteMotion
          ? deleteMotion.permanent
            ? { duration: 0.24, ease: [0.4, 0, 1, 1] }
            : { duration: 0.52, ease: [0.22, 0.72, 0.18, 1] }
          : {
              y: { type: 'spring', damping: 30, stiffness: 420, mass: 0.55 },
              scale: dropReleased
                ? { type: 'spring', damping: 22, stiffness: 170, mass: 0.94 }
                : { type: 'spring', damping: 28, stiffness: 380, mass: 0.6 },
              borderRadius: { duration: 0.2 },
              opacity: { duration: 0.16 },
            }
      }
      onAnimationComplete={finishDeleteMotion}
      onPointerDown={() => selectBox(box.id)}
      onContextMenu={(event) => {
        event.preventDefault();
        if (titleRename.renaming) {
          event.stopPropagation();
          return;
        }
        setAppearanceView(false);
        selectBox(box.id);
        if (isTemporary) {
          contextMenu.closeMenu();
          return;
        }
        contextMenu.openMenu(event.clientX, event.clientY, [
            {
              id: 'rename',
              label: t('menu.rename'),
              icon: <SquarePen size={16} />,
              onSelect: () => titleRename.start(),
            },
            {
              id: 'add',
              label: t('menu.addItem'),
              icon: <Plus size={16} />,
              onSelect: () => {
                setConfirmDelete(false);
                onAddItem();
              },
            },
            {
              id: 'lock',
              label: t(box.isLocked ? 'menu.unlockBox' : 'menu.lockBox'),
              icon: box.isLocked ? <Unlock size={16} /> : <Lock size={16} />,
              onSelect: () => setBoxLocked(box.id, !box.isLocked),
            },
            ...(!isInRecycleBin
              ? [
                  {
                    id: 'collection',
                    label: t(isCollected ? 'menu.removeFromCollection' : 'menu.addToCollection'),
                    icon: isCollected ? <StarOff size={16} /> : <Star size={16} />,
                    onSelect: () =>
                      isCollected ? removeBoxFromCollection(box.id) : addBoxToCollection(box.id),
                  },
                ]
              : []),
            {
              id: 'delete',
              label: t(isInRecycleBin ? 'menu.deletePermanently' : 'menu.moveToRecycleBin'),
              icon: <Trash2 size={16} />,
              danger: true,
              onSelect: () => setConfirmDelete(true),
            },
        ]);
      }}
      style={
        {
          left: boxLeft,
          top: boxTop,
          width: boxWidth,
          height: boxHeight,
          minWidth: 240,
          minHeight: 170,
          rotate: dragTilt,
          transformOrigin: deleteMotion ? '50% 50%' : dragTransformOrigin,
          pointerEvents: deleteMotion ? 'none' : undefined,
          '--box-accent': accent,
        } as MotionStyle & { '--box-accent': string }
      }
    >
      {isTemporary ? (
        <header className="wbn-temporary-box-header" onPointerDown={beginDrag}>
          <span className="wbn-temporary-box-grip" aria-hidden="true" />
          <Button
            type="button"
            data-no-drag
            onClick={() => {
              const title = t('box.collectedItems');
              promoteTemporaryBox(box.id, title);
              titleRename.start(title);
            }}
            title={t('box.promote')}
            aria-label={t('box.promote')}
          >
            <PackageCheck size={15} />
            <span>{t('box.keep')}</span>
          </Button>
        </header>
      ) : (
        <header className="wbn-box-header" onPointerDown={beginDrag}>
          <div className="wbn-box-title-group">
            <Button
              className="wbn-box-icon wbn-icon-frame"
              type="button"
              data-no-drag
              title={t('box.changePreset')}
              aria-label={t('box.changePreset')}
              aria-pressed={appearanceView}
              onClick={() => {
                contextMenu.closeMenu();
                setConfirmDelete(false);
                closeAddView(box.id);
                setAppearanceView((current) => !current);
              }}
            >
              {icon}
            </Button>
            {titleRename.renaming ? (
              <Input
                ref={titleRename.inputRef}
                className="wbn-inline-rename wbn-box-title-input"
                aria-label={t('box.rename', { title: box.title })}
                value={titleRename.draft}
                onChange={(event) => titleRename.setDraft(event.target.value)}
                onBlur={titleRename.commit}
                onKeyDown={titleRename.onKeyDown}
                onContextMenu={titleRename.onContextMenu}
              />
            ) : (
              <span
                className="wbn-box-title"
                data-no-drag
                onDoubleClick={() => titleRename.start()}
              >
                {box.title}
              </span>
            )}
          </div>
          <div className="wbn-box-controls">
            <MotionButton
              variant="icon"
              className="wbn-box-view-toggle wbn-box-lock-toggle wbn-icon-button"
              type="button"
              data-no-drag
              onClick={() => setBoxLocked(box.id, !box.isLocked)}
              aria-label={t(box.isLocked ? 'box.unlock' : 'box.lock')}
              aria-pressed={Boolean(box.isLocked)}
              title={t(box.isLocked ? 'box.unlock' : 'box.lock')}
            >
              {box.isLocked ? <Lock size={15} /> : <Unlock size={15} />}
            </MotionButton>
            <MotionButton
              variant="icon"
              className="wbn-box-view-toggle wbn-icon-button"
              type="button"
              data-no-drag
              onClick={() =>
                setBoxDetailMode(box.id, detailMode === 'detailed' ? 'compact' : 'detailed')
              }
              aria-label={t(
                detailMode === 'detailed' ? 'box.switchToCompact' : 'box.switchToDetailed',
              )}
              aria-pressed={detailMode === 'compact'}
              title={t(detailMode === 'detailed' ? 'box.switchToCompact' : 'box.switchToDetailed')}
            >
              {detailMode === 'detailed' ? (
                <ChevronsDownUp size={15} />
              ) : (
                <ChevronsUpDown size={15} />
              )}
            </MotionButton>
            <MotionButton
              variant="icon"
              className="wbn-box-view-toggle wbn-icon-button"
              type="button"
              data-no-drag
              onClick={() => setBoxViewMode(box.id, viewMode === 'list' ? 'grid' : 'list')}
              aria-label={t(viewMode === 'list' ? 'box.switchToGrid' : 'box.switchToList')}
              aria-pressed={viewMode === 'grid'}
              title={t(viewMode === 'list' ? 'box.switchToGrid' : 'box.switchToList')}
            >
              {viewMode === 'list' ? <LayoutGrid size={15} /> : <List size={15} />}
            </MotionButton>
            <MotionButton
              variant="icon"
              className="wbn-box-delete wbn-icon-button"
              type="button"
              onClick={() => {
                if (appearanceView) {
                  setAppearanceView(false);
                } else if (addViewState?.mode) {
                  closeAddView(box.id);
                } else {
                  setConfirmDelete(true);
                }
              }}
              aria-label={
                appearanceView
                  ? t('box.closeAppearanceView')
                  : addViewState?.mode
                    ? t('box.closeAddView')
                    : t(isInRecycleBin ? 'menu.deletePermanently' : 'menu.moveToRecycleBin')
              }
            >
              <X size={14} />
            </MotionButton>
          </div>
        </header>
      )}
      <div
        className={`wbn-box-content wbn-box-content-mixed${confirmDelete ? ' wbn-box-delete-view' : ''}`}
      >
        {appearanceView ? (
          <BoxAppearanceView
            box={box}
            accent={accent}
            icon={iconId}
            onClose={() => setAppearanceView(false)}
          />
        ) : confirmDelete ? (
          <motion.div
            className="wbn-box-delete-confirm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p>
              {t(
                isInRecycleBin ? 'box.deletePermanentlyQuestion' : 'box.moveToRecycleBinQuestion',
                { type: getBoxTypeLabel(box.preset, t) },
              )}
            </p>
            <div className="wbn-box-delete-actions">
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                className="wbn-box-delete-confirm-button"
                variant="danger"
                onClick={startDeleteMotion}
              >
                {t(isInRecycleBin ? 'common.deletePermanently' : 'common.moveToRecycleBin')}
              </Button>
            </div>
          </motion.div>
        ) : (
          children
        )}
      </div>
      {!isTemporary && !addViewState?.mode && !appearanceView && !confirmDelete ? (
        <footer className="wbn-box-footer">
          <Button variant="ghost" onClick={onAddItem}>
            <Plus size={14} />
            <span>{t('box.addItem')}</span>
          </Button>
        </footer>
      ) : null}
      {!isTemporary ? (
        <Button
          className="wbn-resize-handle"
          type="button"
          disabled={box.isLocked}
          aria-label={t('box.resize', { title: box.title })}
          onPointerDown={beginResize}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M21 15 15 21M21 8 8 21"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </Button>
      ) : null}
      {contextMenu.menu}
    </motion.article>
  );
}

function getBoxTypeLabel(preset: WorkspaceBox['preset'], t: ReturnType<typeof useI18n>['t']) {
  return preset === 'folder'
    ? t('box.folder')
    : preset === 'bookmark'
      ? t('box.bookmark')
      : preset === 'clipboard'
        ? t('box.clipboard')
        : t('box.general');
}
