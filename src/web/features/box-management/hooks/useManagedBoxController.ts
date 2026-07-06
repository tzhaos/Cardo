import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../app/hooks/useI18n';
import { clearEditingSessionIfActive } from '../../../app/controllers/interactionController';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import { useCanvasStore } from '../../../app/stores/useCanvasStore';
import { useViewportCamera } from '../../workspace-desktop';
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
};

export function useManagedBoxController(box: WorkspaceBox) {
  const { t, locale } = useI18n();
  const snapshot = useWorkspaceSnapshot();
  const dispatch = useWorkspaceDispatch();
  const activeBoxId = useInteractionStore((state) => state.activeBoxId);
  const editingSessionId = useInteractionStore((state) => state.editingSessionId);
  const camera = useViewportCamera();
  const interactionMode = useCanvasStore((state) => state.interactionMode);
  const isPanModifierActive = useCanvasStore((state) => state.isPanModifierActive);
  const setActiveBox = useInteractionStore((state) => state.setActiveBox);
  const setEditingSessionId = useInteractionStore((state) => state.setEditingSessionId);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const editorId = `box:${box.id}:title`;
  const isActive = activeBoxId === box.id;
  const isEditing = editingSessionId === editorId;
  const isInteractionLocked = Boolean(editingSessionId && editingSessionId !== editorId);
  const displayTitle = getBoxDisplayTitle(box, t);
  const fallbackTitle = getBoxDisplayTitle({ ...box, customTitle: null }, t);

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

  const handleToggleCollapse = () => {
    setShowAddMenu(false);
    updateBox({ isCollapsed: !box.isCollapsed });
  };

  const pageBoxes = getOrderedBoxes(snapshot).filter(
    (candidateBox) => candidateBox.templateId === box.templateId,
  );

  const { handleDragStart } = useBoxDrag({
    box,
    allBoxes: pageBoxes,
    onFocus: focusBox,
    onUpdate: updateBox,
    setIsDragging,
  });
  const { handleResize } = useBoxResize({
    box,
    allBoxes: pageBoxes,
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
    labels: {
      toggleLayout: t('box.toggleLayout'),
      lockPosition: t('box.lockPosition'),
      unlockPosition: t('box.unlockPosition'),
      collapse: t('box.collapse'),
      expand: t('box.expand'),
      close: t('box.close'),
    },
    focusBox,
    handleMouseEnter: () => setIsHovering(true),
    handleMouseLeave: () => setIsHovering(false),
    handleDragStart,
    handleResize,
    isCanvasTransforming: interactionMode === 'panning' || interactionMode === 'box-dragging',
    isPanModifierActive,
    camera,
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
