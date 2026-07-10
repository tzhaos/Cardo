import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { Lock, Plus, SquarePen, Trash2, X } from 'lucide-react';
import { animate as animateMotion, motion, useMotionValue, useSpring } from 'motion/react';
import type { MotionStyle } from 'motion/react';
import type { WorkspaceBox } from '../../domain/workspace';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import {
  startWindowPointerSession,
  type WindowPointerSession,
} from '../../app/windowPointerSession';
import { useFloatingMenu } from '../floating-menu/useFloatingMenu';
import { useI18n } from '../../i18n/useI18n';

interface BaseBoxFrameProps {
  box: WorkspaceBox;
  icon: ReactNode;
  accent: string;
  children: ReactNode;
  onAddItem: () => void;
  skipEntryAnimation?: boolean;
}

export function BaseBoxFrame({
  box,
  icon,
  accent,
  children,
  onAddItem,
  skipEntryAnimation = false,
}: BaseBoxFrameProps) {
  const updateBoxFrame = useWorkspaceStore((state) => state.updateBoxFrame);
  const renameBox = useWorkspaceStore((state) => state.renameBox);
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
  const [titleDraft, setTitleDraft] = useState(box.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const pointerSessionRef = useRef<WindowPointerSession | null>(null);
  const boxLeft = useMotionValue(box.frame.x);
  const boxTop = useMotionValue(box.frame.y);
  const boxWidth = useMotionValue(box.frame.width);
  const boxHeight = useMotionValue(box.frame.height);
  const dragTilt = useMotionValue(0);
  const smoothDragTilt = useSpring(dragTilt, { stiffness: 420, damping: 34, mass: 0.42 });
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
    if ((event.target as HTMLElement).closest('button,input,textarea,select,[data-no-drag]')) {
      return;
    }

    event.preventDefault();
    closeMenu();
    pointerSessionRef.current?.end();
    beginBoxDrag(box.id);
    const startX = event.clientX;
    const startY = event.clientY;
    const startFrame = box.frame;
    let latestFrame = startFrame;
    const session = startWindowPointerSession({
      onMove: (moveEvent) => {
        const overTopBar = useUiStore.getState().boxDragOverTopBar;
        dragTilt.set(
          overTopBar ? 0 : Math.min(2.2, Math.max(-2.2, (moveEvent.clientX - startX) * 0.012)),
        );
        latestFrame = {
          ...startFrame,
          x: Math.max(8, Math.round(startFrame.x + moveEvent.clientX - startX)),
          y: Math.max(8, Math.round(startFrame.y + moveEvent.clientY - startY)),
        };
        boxLeft.set(latestFrame.x);
        boxTop.set(latestFrame.y);
      },
      onEnd: (reason) => {
        dragTilt.set(0);
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
    event.stopPropagation();
    event.preventDefault();
    closeMenu();
    pointerSessionRef.current?.end();
    const startX = event.clientX;
    const startY = event.clientY;
    const startFrame = box.frame;
    let latestFrame = startFrame;
    const session = startWindowPointerSession({
      onMove: (moveEvent) => {
        latestFrame = {
          ...startFrame,
          width: Math.max(240, Math.round(startFrame.width + moveEvent.clientX - startX)),
          height: Math.max(170, Math.round(startFrame.height + moveEvent.clientY - startY)),
        };
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

  useEffect(() => {
    if (draggingOverTopBar) {
      dragTilt.set(0);
    }
  }, [dragTilt, draggingOverTopBar]);

  return (
    <motion.article
      className={visualClassName}
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
        selectBox(box.id);
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
              label: t('menu.lock'),
              icon: <Lock size={16} />,
              disabled: true,
              onSelect: () => undefined,
            },
            {
              id: 'delete',
              label: t('menu.deleteBox'),
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
          rotateZ: smoothDragTilt,
          transformOrigin: '50% 18%',
          '--box-accent': accent,
        } as MotionStyle & { '--box-accent': string }
      }
    >
      <header className="wbn-box-header" onPointerDown={beginDrag}>
        <div className="wbn-box-title-group">
          <span className="wbn-box-icon wbn-icon-frame">{icon}</span>
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
            addViewState?.mode ? t('box.closeAddView') : t('page.delete', { title: box.title })
          }
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
        >
          <X size={14} />
        </motion.button>
      </header>
      <div
        className={`wbn-box-content wbn-box-content-${box.type}${confirmDelete ? ' wbn-box-delete-view' : ''}`}
      >
        {confirmDelete ? (
          <motion.div
            className="wbn-box-delete-confirm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p>{t('box.deleteQuestion', { type: getBoxTypeLabel(box.type, t) })}</p>
            <div className="wbn-box-delete-actions">
              <button type="button" onClick={() => setConfirmDelete(false)}>
                {t('common.cancel')}
              </button>
              <button
                className="wbn-box-delete-confirm-button"
                type="button"
                onClick={() => deleteBox(box.id)}
              >
                {t('common.delete')}
              </button>
            </div>
          </motion.div>
        ) : (
          children
        )}
      </div>
      {!addViewState?.mode && !confirmDelete ? (
        <footer className="wbn-box-footer">
          <button type="button" onClick={onAddItem}>
            <Plus size={14} />
            <span>{t('box.addItem')}</span>
          </button>
        </footer>
      ) : null}
      <button
        className="wbn-resize-handle"
        type="button"
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
    </motion.article>
  );
}

function getBoxTypeLabel(type: WorkspaceBox['type'], t: ReturnType<typeof useI18n>['t']) {
  return type === 'folder'
    ? t('box.folder')
    : type === 'bookmark'
      ? t('box.bookmark')
      : t('box.clipboard');
}
