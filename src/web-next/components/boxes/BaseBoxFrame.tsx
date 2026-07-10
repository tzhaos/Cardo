import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { Lock, Plus, SquarePen, Trash2, X } from 'lucide-react';
import { motion } from 'motion/react';
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
}

export function BaseBoxFrame({ box, icon, accent, children, onAddItem }: BaseBoxFrameProps) {
  const updateBoxFrame = useWorkspaceStore((state) => state.updateBoxFrame);
  const renameBox = useWorkspaceStore((state) => state.renameBox);
  const deleteBox = useWorkspaceStore((state) => state.deleteBox);
  const beginBoxDrag = useUiStore((state) => state.beginBoxDrag);
  const endBoxDrag = useUiStore((state) => state.endBoxDrag);
  const draggedBoxId = useUiStore((state) => state.draggedBoxId);
  const selectedBoxId = useUiStore((state) => state.selectedBoxId);
  const selectBox = useUiStore((state) => state.selectBox);
  const addViewState = useUiStore((state) => state.addDrafts[box.id]);
  const requestCloseAddView = useUiStore((state) => state.requestCloseAddView);
  const { openMenu, closeMenu } = useFloatingMenu();
  const [renamingTitle, setRenamingTitle] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [titleDraft, setTitleDraft] = useState(box.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const pointerSessionRef = useRef<WindowPointerSession | null>(null);
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
    const session = startWindowPointerSession({
      onMove: (moveEvent) => {
        updateBoxFrame(box.id, {
          ...startFrame,
          x: Math.max(8, Math.round(startFrame.x + moveEvent.clientX - startX)),
          y: Math.max(8, Math.round(startFrame.y + moveEvent.clientY - startY)),
        });
      },
      onEnd: (reason) => {
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
    const session = startWindowPointerSession({
      onMove: (moveEvent) => {
        updateBoxFrame(box.id, {
          ...startFrame,
          width: Math.max(240, Math.round(startFrame.width + moveEvent.clientX - startX)),
          height: Math.max(170, Math.round(startFrame.height + moveEvent.clientY - startY)),
        });
      },
      onEnd: () => {
        if (pointerSessionRef.current === session) {
          pointerSessionRef.current = null;
        }
      },
    });
    pointerSessionRef.current = session;
  };

  return (
    <motion.article
      className={`wbn-box${draggedBoxId === box.id ? ' wbn-box-dragging' : ''}${selectedBoxId === box.id ? ' wbn-box-selected' : ''}${addViewState?.mode || confirmDelete ? ' wbn-box-local-view' : ''}`}
      initial={{ left: box.frame.x, top: box.frame.y, scale: 0.8, opacity: 0 }}
      animate={{
        left: box.frame.x,
        top: box.frame.y,
        scale: 1,
        opacity: draggedBoxId === box.id ? 0.82 : 1,
      }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{
        left:
          draggedBoxId === box.id
            ? { duration: 0 }
            : { type: 'spring', damping: 28, stiffness: 260 },
        top:
          draggedBoxId === box.id
            ? { duration: 0 }
            : { type: 'spring', damping: 28, stiffness: 260 },
        scale: { type: 'spring', damping: 25, stiffness: 300 },
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
          width: box.frame.width,
          height: box.frame.height,
          minWidth: 240,
          minHeight: 170,
          '--box-accent': accent,
        } as React.CSSProperties
      }
    >
      <header className="wbn-box-header" onPointerDown={beginDrag}>
        <div className="wbn-box-title-group">
          <span className="wbn-box-icon">{icon}</span>
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
          className="wbn-box-delete"
          type="button"
          onClick={() => {
            if (addViewState?.mode) {
              requestCloseAddView(box.id);
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
