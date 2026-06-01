import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../app/hooks/useI18n';
import {
  clearBoxTransitionIfActive,
  clearEditingSessionIfActive,
} from '../../../app/controllers/interactionController';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import {
  useWorkspaceBox,
  useWorkspaceDispatch,
  useWorkspaceSnapshot,
} from '../../../app/stores/useWorkspaceSelectors';
import { getBoxDisplayTitle } from '../../../../core/domains/workspace/model/boxTitles';
import { getOrderedBoxes } from '../../../../core/domains/workspace/model/workspaceSelectors';
import type { WorkspaceBox } from '../../../../core/domains/workspace/model/workspace';
import { useBoxDrag } from './useBoxDrag';
import { useBoxResize } from './useBoxResize';

type BoxUpdates = {
  bounds?: Partial<WorkspaceBox['bounds']>;
  customTitle?: string | null;
  isLocked?: boolean;
  layout?: WorkspaceBox['layout'];
  isCollapsed?: boolean;
  isMinimized?: boolean;
};

function getDockTransitionRect(boxId: string) {
  const dockItem = document.getElementById(`dock-box-${boxId}`);

  if (!dockItem) {
    return null;
  }

  const rect = dockItem.getBoundingClientRect();

  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function useManagedBoxController(box: WorkspaceBox) {
  const { t, locale } = useI18n();
  const snapshot = useWorkspaceSnapshot();
  const dispatch = useWorkspaceDispatch();
  const activeBoxId = useInteractionStore((state) => state.activeBoxId);
  const boxTransition = useInteractionStore((state) => state.boxTransition);
  const editingSessionId = useInteractionStore((state) => state.editingSessionId);
  const setActiveBox = useInteractionStore((state) => state.setActiveBox);
  const setBoxTransition = useInteractionStore((state) => state.setBoxTransition);
  const setEditingSessionId = useInteractionStore((state) => state.setEditingSessionId);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const minimizeTimerRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);

  const editorId = `box:${box.id}:title`;
  const isActive = activeBoxId === box.id;
  const isEditing = editingSessionId === editorId;
  const isInteractionLocked = Boolean(editingSessionId && editingSessionId !== editorId);
  const currentBoxTransition = boxTransition?.boxId === box.id ? boxTransition : null;
  const displayTitle = getBoxDisplayTitle(box, t);
  const fallbackTitle = t(
    box.role === 'folders'
      ? 'box.folders'
      : box.role === 'links'
        ? 'box.links'
        : box.role === 'notes'
          ? 'box.notes'
          : 'box.new',
  );

  useEffect(() => {
    if (isActive) {
      return;
    }

    setShowAddMenu(false);
  }, [isActive]);

  useEffect(() => {
    if (!isEditing) {
      setDraftTitle(displayTitle);
      return;
    }

    inputRef.current?.focus();
    inputRef.current?.select();
  }, [displayTitle, isEditing]);

  useEffect(
    () => () => {
      if (minimizeTimerRef.current) {
        window.clearTimeout(minimizeTimerRef.current);
      }

      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }

      clearEditingSessionIfActive(editorId);
    },
    [editorId],
  );

  const focusBox = () => {
    dispatch({ type: 'box.bringToFront', boxId: box.id });
    setActiveBox(box.id);
  };

  const updateBox = (updates: BoxUpdates) => {
    dispatch({
      type: 'box.update',
      boxId: box.id,
      updates,
    });
  };

  const queueTransitionCleanup = (boxId: string) => {
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }

    transitionTimerRef.current = window.setTimeout(() => {
      clearBoxTransitionIfActive(boxId);
    }, 420);
  };

  const handleMinimize = () => {
    if (box.isMinimized || currentBoxTransition?.kind === 'minimize') {
      return;
    }

    setBoxTransition({
      boxId: box.id,
      kind: 'minimize',
      dockRect: getDockTransitionRect(box.id),
    });
    queueTransitionCleanup(box.id);
    setShowAddMenu(false);

    minimizeTimerRef.current = window.setTimeout(() => {
      updateBox({ isMinimized: true });
    }, 280);
  };

  const handleToggleCollapse = () => {
    setShowAddMenu(false);
    updateBox({ isCollapsed: !box.isCollapsed });
  };

  const allBoxes = getOrderedBoxes(snapshot);

  const { handleDragStart } = useBoxDrag({
    box,
    allBoxes,
    onFocus: focusBox,
    onUpdate: updateBox,
    setIsDragging,
  });
  const { handleResize } = useBoxResize({
    box,
    onUpdate: updateBox,
  });

  return {
    inputRef,
    editingSessionId,
    isActive,
    isDragging,
    isHovering,
    isEditing,
    isInteractionLocked,
    showAddMenu,
    setShowAddMenu,
    draftTitle,
    displayTitle,
    transitionKind: currentBoxTransition?.kind ?? null,
    transitionDockRect: currentBoxTransition?.dockRect ?? null,
    labels: {
      toggleLayout: t('box.toggleLayout'),
      lockPosition: t('box.lockPosition'),
      unlockPosition: t('box.unlockPosition'),
      collapse: t('box.collapse'),
      expand: t('box.expand'),
      minimize: t('box.minimize'),
      close: t('box.close'),
    },
    focusBox,
    handleMouseEnter: () => setIsHovering(true),
    handleMouseLeave: () => setIsHovering(false),
    handleDragStart,
    handleResize,
    startTitleEdit: () => {
      if (isInteractionLocked) {
        return;
      }

      setDraftTitle(displayTitle);
      setEditingSessionId(editorId);
    },
    setDraftTitle,
    finishTitleEdit: (shouldSave: boolean) => {
      if (shouldSave) {
        const nextTitle = draftTitle.trim();
        updateBox({
          customTitle: !nextTitle || nextTitle === fallbackTitle ? null : nextTitle,
        });
      } else {
        setDraftTitle(displayTitle);
      }

      clearEditingSessionIfActive(editorId);
    },
    toggleLayout: () => updateBox({ layout: box.layout === 'grid' ? 'list' : 'grid' }),
    toggleLock: () => updateBox({ isLocked: !box.isLocked }),
    toggleCollapse: handleToggleCollapse,
    minimize: handleMinimize,
    close: () => {
      const confirmMessage =
        locale === 'zh'
          ? `删除“${displayTitle}”？此操作无法撤销。`
          : `Delete "${displayTitle}"? This action cannot be undone.`;

      if (!window.confirm(confirmMessage)) {
        return;
      }

      dispatch({ type: 'box.delete', boxId: box.id });
    },
  };
}

export function useManagedBox(boxId: string) {
  return useWorkspaceBox(boxId);
}
