import { useEffect, useRef, useState } from 'react';
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
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { AnimatePresence, animate as animateMotion, motion, useMotionValue } from 'motion/react';
import type { MotionStyle } from 'motion/react';
import {
  isRecycleBinPageId,
  type WorkspaceBox,
  type WorkspaceBoxIcon,
} from '../../domain/workspace';
import { useCanvasStore } from '../../app/stores/canvasStore';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import {
  constrainBoxFrameToCanvas,
  constrainBoxResizeToCanvas,
  createCanvasWorldBounds,
} from '../../domain/canvasGeometry';
import {
  startWindowPointerSession,
  type WindowPointerSession,
} from '../../app/windowPointerSession';
import { useFloatingMenu } from '../floating-menu/useFloatingMenu';
import { useI18n } from '../../i18n/useI18n';
import { BoxAppearancePopover } from './BoxAppearancePopover';

interface BaseBoxFrameProps {
  box: WorkspaceBox;
  icon: ReactNode;
  iconId: WorkspaceBoxIcon;
  accent: string;
  children: ReactNode;
  onAddItem: () => void;
  skipEntryAnimation?: boolean;
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
  const beginBoxDrag = useUiStore((state) => state.beginBoxDrag);
  const endBoxDrag = useUiStore((state) => state.endBoxDrag);
  const draggedBoxId = useUiStore((state) => state.draggedBoxId);
  const boxDragOverTopBar = useUiStore((state) => state.boxDragOverTopBar);
  const boxDropPageId = useUiStore((state) => state.boxDropPageId);
  const boxDropRelease = useUiStore((state) => state.boxDropRelease);
  const selectedBoxId = useUiStore((state) => state.selectedBoxId);
  const selectBox = useUiStore((state) => state.selectBox);
  const addViewState = useUiStore((state) => state.addDrafts[box.id]);
  const closeAddView = useUiStore((state) => state.closeAddView);
  const { openMenu, closeMenu } = useFloatingMenu();
  const [renamingTitle, setRenamingTitle] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [appearanceAnchor, setAppearanceAnchor] = useState<DOMRect | null>(null);
  const [titleDraft, setTitleDraft] = useState(box.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const pointerSessionRef = useRef<WindowPointerSession | null>(null);
  const boxLeft = useMotionValue(box.frame.x);
  const boxTop = useMotionValue(box.frame.y);
  const boxWidth = useMotionValue(box.frame.width);
  const boxHeight = useMotionValue(box.frame.height);
  const { t } = useI18n();

  useEffect(
    () => () => {
      pointerSessionRef.current?.end();
    },
    [],
  );

  useEffect(() => {
    if (!renamingTitle) {
      setTitleDraft(box.title);
    }
  }, [box.title, renamingTitle]);

  useEffect(() => {
    if (renamingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [renamingTitle]);

  const commitTitle = () => {
    if (titleDraft.trim()) {
      renameBox(box.id, titleDraft);
    } else {
      setTitleDraft(box.title);
    }
    setRenamingTitle(false);
  };

  const beginDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (box.isLocked) {
      return;
    }

    if ((event.target as HTMLElement).closest('button,input,textarea,select,[data-no-drag]')) {
      return;
    }

    event.preventDefault();
    setAppearanceAnchor(null);
    closeMenu();
    pointerSessionRef.current?.end();
    beginBoxDrag(box.id);
    const startX = event.clientX;
    const startY = event.clientY;
    const startFrame = box.frame;
    let latestFrame = startFrame;
    const session = startWindowPointerSession({
      pointerId: event.pointerId,
      onMove: (moveEvent) => {
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
        updateBoxFrame(box.id, latestFrame);
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
    closeMenu();
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
  const dropReleased = boxDropRelease?.boxId === box.id;
  const compactScale = Math.max(0.22, Math.min(0.46, 136 / box.frame.width, 86 / box.frame.height));
  const isInRecycleBin = isRecycleBinPageId(box.pageId);
  const isTemporary = box.kind === 'temporary';
  const viewMode = isTemporary ? 'list' : (box.viewMode ?? 'list');
  const detailMode = isTemporary ? 'detailed' : (box.detailMode ?? 'detailed');
  const visualScale = draggingOverTopBar
    ? compactScale * (draggingOverTab ? 0.9 : 1)
    : dragging
      ? 1.028
      : 1;
  const visualClassName = [
    'wbn-box',
    dragging ? 'wbn-box-dragging' : '',
    draggingOverTopBar ? 'wbn-box-dragging-bar' : '',
    draggingOverTab ? 'wbn-box-dragging-tab' : '',
    dropReleased ? 'wbn-box-drop-released' : '',
    selectedBoxId === box.id ? 'wbn-box-selected' : '',
    detailMode === 'compact' ? 'wbn-box-compact' : '',
    box.isLocked ? 'wbn-box-locked' : '',
    isTemporary ? 'wbn-box-temporary' : '',
    addViewState?.mode || confirmDelete ? 'wbn-box-local-view' : '',
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
      ? { type: 'spring' as const, damping: 23, stiffness: 250, mass: 0.86 }
      : { type: 'spring' as const, damping: 28, stiffness: 260 };
    const leftAnimation = animateMotion(boxLeft, box.frame.x, positionTransition);
    const topAnimation = animateMotion(boxTop, box.frame.y, positionTransition);
    return () => {
      leftAnimation.stop();
      topAnimation.stop();
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

  return (
    <motion.article
      className={visualClassName}
      data-canvas-box
      data-box-id={box.id}
      initial={skipEntryAnimation ? false : { scale: 0.8, opacity: 0 }}
      animate={{
        y: dragging && !draggingOverTopBar ? -7 : 0,
        scale: visualScale,
        opacity: draggingOverTopBar ? 0.94 : dragging ? 0.97 : 1,
        borderRadius: draggingOverTopBar ? 24 : 16,
      }}
      transition={{
        y: { type: 'spring', damping: 30, stiffness: 420, mass: 0.55 },
        scale: dropReleased
          ? { type: 'spring', damping: 19, stiffness: 285, mass: 0.78 }
          : { type: 'spring', damping: 28, stiffness: 380, mass: 0.6 },
        borderRadius: { duration: 0.2 },
        opacity: { duration: 0.16 },
      }}
      onPointerDown={() => selectBox(box.id)}
      onContextMenu={(event) => {
        event.preventDefault();
        setAppearanceAnchor(null);
        selectBox(box.id);
        if (isTemporary) {
          closeMenu();
          return;
        }
        openMenu({
          id: `box-${box.id}`,
          x: event.clientX,
          y: event.clientY,
          items: [
            {
              id: 'rename',
              label: t('menu.rename'),
              icon: <SquarePen size={16} />,
              onSelect: () => setRenamingTitle(true),
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
            {
              id: 'delete',
              label: t(isInRecycleBin ? 'menu.deletePermanently' : 'menu.moveToRecycleBin'),
              icon: <Trash2 size={16} />,
              danger: true,
              onSelect: () => setConfirmDelete(true),
            },
          ],
        });
      }}
      style={
        {
          left: boxLeft,
          top: boxTop,
          width: boxWidth,
          height: boxHeight,
          minWidth: 240,
          minHeight: 170,
          '--box-accent': accent,
        } as MotionStyle & { '--box-accent': string }
      }
    >
      {isTemporary ? (
        <header className="wbn-temporary-box-header" onPointerDown={beginDrag}>
          <span className="wbn-temporary-box-grip" aria-hidden="true" />
          <button
            type="button"
            data-no-drag
            onClick={() => {
              const title = t('box.collectedItems');
              setTitleDraft(title);
              promoteTemporaryBox(box.id, title);
              setRenamingTitle(true);
            }}
            title={t('box.promote')}
            aria-label={t('box.promote')}
          >
            <PackageCheck size={15} />
            <span>{t('box.keep')}</span>
          </button>
        </header>
      ) : (
        <header className="wbn-box-header" onPointerDown={beginDrag}>
          <div className="wbn-box-title-group">
            <button
              className="wbn-box-icon wbn-icon-frame"
              type="button"
              data-no-drag
              data-box-appearance-trigger={box.id}
              title={t('box.changePreset')}
              aria-label={t('box.changePreset')}
              onClick={(event) => {
                closeMenu();
                setAppearanceAnchor((current) =>
                  current ? null : event.currentTarget.getBoundingClientRect(),
                );
              }}
            >
              {icon}
            </button>
            {renamingTitle ? (
              <input
                ref={titleInputRef}
                className="wbn-inline-rename wbn-box-title-input"
                aria-label={t('box.rename', { title: box.title })}
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={commitTitle}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.currentTarget.blur();
                  }
                  if (event.key === 'Escape') {
                    setTitleDraft(box.title);
                    setRenamingTitle(false);
                  }
                }}
              />
            ) : (
              <span
                className="wbn-box-title"
                data-no-drag
                onDoubleClick={() => setRenamingTitle(true)}
              >
                {box.title}
              </span>
            )}
          </div>
          <div className="wbn-box-controls">
            <motion.button
              className="wbn-box-view-toggle wbn-box-lock-toggle wbn-icon-button"
              type="button"
              data-no-drag
              onClick={() => setBoxLocked(box.id, !box.isLocked)}
              aria-label={t(box.isLocked ? 'box.unlock' : 'box.lock')}
              aria-pressed={Boolean(box.isLocked)}
              title={t(box.isLocked ? 'box.unlock' : 'box.lock')}
            >
              {box.isLocked ? <Lock size={15} /> : <Unlock size={15} />}
            </motion.button>
            <motion.button
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
            </motion.button>
            <motion.button
              className="wbn-box-view-toggle wbn-icon-button"
              type="button"
              data-no-drag
              onClick={() => setBoxViewMode(box.id, viewMode === 'list' ? 'grid' : 'list')}
              aria-label={t(viewMode === 'list' ? 'box.switchToGrid' : 'box.switchToList')}
              aria-pressed={viewMode === 'grid'}
              title={t(viewMode === 'list' ? 'box.switchToGrid' : 'box.switchToList')}
            >
              {viewMode === 'list' ? <LayoutGrid size={15} /> : <List size={15} />}
            </motion.button>
            <motion.button
              className="wbn-box-delete wbn-icon-button"
              type="button"
              onClick={() => {
                if (addViewState?.mode) {
                  closeAddView(box.id);
                } else {
                  setConfirmDelete(true);
                }
              }}
              aria-label={
                addViewState?.mode
                  ? t('box.closeAddView')
                  : t(isInRecycleBin ? 'menu.deletePermanently' : 'menu.moveToRecycleBin')
              }
            >
              <X size={14} />
            </motion.button>
          </div>
        </header>
      )}
      <div
        className={`wbn-box-content wbn-box-content-mixed${confirmDelete ? ' wbn-box-delete-view' : ''}`}
      >
        {confirmDelete ? (
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
              <button type="button" onClick={() => setConfirmDelete(false)}>
                {t('common.cancel')}
              </button>
              <button
                className="wbn-box-delete-confirm-button"
                type="button"
                onClick={() => deleteBox(box.id)}
              >
                {t(isInRecycleBin ? 'common.deletePermanently' : 'common.moveToRecycleBin')}
              </button>
            </div>
          </motion.div>
        ) : (
          children
        )}
      </div>
      {!isTemporary && !addViewState?.mode && !confirmDelete ? (
        <footer className="wbn-box-footer">
          <button type="button" onClick={onAddItem}>
            <Plus size={14} />
            <span>{t('box.addItem')}</span>
          </button>
        </footer>
      ) : null}
      {!isTemporary ? (
        <button
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
        </button>
      ) : null}
      <AnimatePresence>
        {appearanceAnchor ? (
          <BoxAppearancePopover
            box={box}
            accent={accent}
            icon={iconId}
            anchor={appearanceAnchor}
            onClose={() => setAppearanceAnchor(null)}
          />
        ) : null}
      </AnimatePresence>
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
