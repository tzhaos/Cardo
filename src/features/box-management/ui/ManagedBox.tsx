import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../app/hooks/useI18n';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import {
  useWorkspaceBox,
  useWorkspaceDispatch,
  useWorkspaceSnapshot,
} from '../../../app/stores/useWorkspaceSelectors';
import { getBoxDisplayTitle } from '../../../domains/workspace/model/boxTitles';
import type { WorkspaceBox } from '../../../domains/workspace/model/workspace';
import BoxContainer from '../../../widgets/Box/BoxContainer';
import BoxHeader from '../../../widgets/Box/BoxHeader';
import { ManagedBoxContent } from '../../item-management';
import { useBoxDrag } from '../hooks/useBoxDrag';
import { useBoxResize } from '../hooks/useBoxResize';

interface ManagedBoxProps {
  boxId: string;
}

interface ManagedBoxViewProps {
  box: WorkspaceBox;
}

function ManagedBoxView({ box }: ManagedBoxViewProps) {
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

      if (useInteractionStore.getState().editingSessionId === editorId) {
        useInteractionStore.getState().setEditingSessionId(null);
      }
    },
    [editorId],
  );

  const focusBox = () => {
    dispatch({ type: 'box.bringToFront', boxId: box.id });
    setActiveBox(box.id);
  };

  const onUpdateBox = (updates: {
    bounds?: Partial<WorkspaceBox['bounds']>;
    customTitle?: string | null;
    isLocked?: boolean;
    layout?: WorkspaceBox['layout'];
    isCollapsed?: boolean;
    isMinimized?: boolean;
  }) => {
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
      const currentTransition = useInteractionStore.getState().boxTransition;

      if (currentTransition?.boxId === boxId) {
        useInteractionStore.getState().setBoxTransition(null);
      }
    }, 420);
  };

  const getDockTransitionRect = () => {
    const dockItem = document.getElementById(`dock-box-${box.id}`);

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
  };

  const handleMinimize = () => {
    if (box.isMinimized || currentBoxTransition?.kind === 'minimize') {
      return;
    }

    setBoxTransition({
      boxId: box.id,
      kind: 'minimize',
      dockRect: getDockTransitionRect(),
    });
    queueTransitionCleanup(box.id);
    setShowAddMenu(false);

    minimizeTimerRef.current = window.setTimeout(() => {
      onUpdateBox({ isMinimized: true });
    }, 280);
  };

  const handleToggleCollapse = () => {
    setShowAddMenu(false);
    onUpdateBox({ isCollapsed: !box.isCollapsed });
  };

  const allBoxes = snapshot.boxOrder
    .map((currentBoxId) => snapshot.boxesById[currentBoxId])
    .filter(Boolean);

  const { handleDragStart } = useBoxDrag({
    box,
    allBoxes,
    onFocus: focusBox,
    onUpdate: onUpdateBox,
    setIsDragging,
  });
  const { handleResize } = useBoxResize({
    box,
    onUpdate: onUpdateBox,
  });

  return (
    <BoxContainer
      box={box}
      isActive={isActive}
      isDragging={isDragging}
      transitionKind={currentBoxTransition?.kind ?? null}
      transitionDockRect={currentBoxTransition?.dockRect ?? null}
      editingSessionId={editingSessionId}
      onFocus={focusBox}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
      }}
      onResizeStart={handleResize}
      header={
        <BoxHeader
          box={box}
          displayTitle={displayTitle}
          draftTitle={draftTitle}
          isActive={isActive}
          isHovering={isHovering}
          isEditing={isEditing}
          isInteractionLocked={isInteractionLocked}
          inputRef={inputRef}
          toggleLayoutLabel={t('box.toggleLayout')}
          lockPositionLabel={t('box.lockPosition')}
          unlockPositionLabel={t('box.unlockPosition')}
          collapseLabel={t('box.collapse')}
          expandLabel={t('box.expand')}
          minimizeLabel={t('box.minimize')}
          closeLabel={t('box.close')}
          onDragStart={handleDragStart}
          onStartEdit={(event) => {
            event.stopPropagation();

            if (isInteractionLocked) {
              return;
            }

            setDraftTitle(displayTitle);
            setEditingSessionId(editorId);
          }}
          onTitleChange={setDraftTitle}
          onFinishEditing={(shouldSave) => {
            if (shouldSave) {
              const nextTitle = draftTitle.trim();
              onUpdateBox({
                customTitle: !nextTitle || nextTitle === fallbackTitle ? null : nextTitle,
              });
            } else {
              setDraftTitle(displayTitle);
            }

            if (useInteractionStore.getState().editingSessionId === editorId) {
              setEditingSessionId(null);
            }
          }}
          onToggleLayout={() => onUpdateBox({ layout: box.layout === 'grid' ? 'list' : 'grid' })}
          onToggleLock={() => onUpdateBox({ isLocked: !box.isLocked })}
          onToggleCollapse={handleToggleCollapse}
          onMinimize={handleMinimize}
          onClose={() => {
            const confirmMessage =
              locale === 'zh'
                ? `删除“${displayTitle}”？此操作无法撤销。`
                : `Delete "${displayTitle}"? This action cannot be undone.`;

            if (!window.confirm(confirmMessage)) {
              return;
            }

            dispatch({ type: 'box.delete', boxId: box.id });
          }}
        />
      }
      content={
        <ManagedBoxContent box={box} showAddMenu={showAddMenu} setShowAddMenu={setShowAddMenu} />
      }
    />
  );
}

export default function ManagedBox({ boxId }: ManagedBoxProps) {
  const box = useWorkspaceBox(boxId);

  if (!box) {
    return null;
  }

  return <ManagedBoxView box={box} />;
}
