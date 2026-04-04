import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../app/hooks/useI18n';
import { useInteractionStore } from '../../../app/stores/useInteractionStore';
import {
  useWorkspaceBox,
  useWorkspaceDispatch,
  useWorkspaceSnapshot,
} from '../../../app/stores/useWorkspaceSelectors';
import { getBoxDisplayTitle } from '../../../domains/workspace/model/boxTitles';
import BoxContainer from '../../../widgets/Box/BoxContainer';
import BoxHeader from '../../../widgets/Box/BoxHeader';
import ManagedBoxContent from '../../item-management/ui/ManagedBoxContent';
import { useBoxDrag } from '../hooks/useBoxDrag';
import { useBoxResize } from '../hooks/useBoxResize';

interface ManagedBoxProps {
  boxId: string;
}

export default function ManagedBox({ boxId }: ManagedBoxProps) {
  const { t } = useI18n();
  const box = useWorkspaceBox(boxId);
  const snapshot = useWorkspaceSnapshot();
  const dispatch = useWorkspaceDispatch();
  const activeBoxId = useInteractionStore((state) => state.activeBoxId);
  const editingSessionId = useInteractionStore((state) => state.editingSessionId);
  const setActiveBox = useInteractionStore((state) => state.setActiveBox);
  const setEditingSessionId = useInteractionStore((state) => state.setEditingSessionId);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (!box) {
    return null;
  }

  const editorId = `box:${box.id}:title`;
  const isActive = activeBoxId === box.id;
  const isEditing = editingSessionId === editorId;
  const isInteractionLocked = Boolean(editingSessionId && editingSessionId !== editorId);
  const displayTitle = getBoxDisplayTitle(box, t);
  const fallbackTitle = t(box.role === 'folders' ? 'box.folders' : box.role === 'links' ? 'box.links' : box.role === 'notes' ? 'box.notes' : 'box.new');

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
      if (useInteractionStore.getState().editingSessionId === editorId) {
        useInteractionStore.getState().setEditingSessionId(null);
      }
    },
    [editorId],
  );

  const applyBoxUpdates = (updates: Parameters<typeof dispatch>[0] extends infer Command ? Command : never) => {
    dispatch(updates as never);
  };

  const updateBox = (updates: Parameters<typeof dispatch>[0] extends infer Command ? never : never) => updates;

  const focusBox = () => {
    dispatch({ type: 'box.bringToFront', boxId: box.id });
    setActiveBox(box.id);
  };

  const onUpdateBox = (updates: { bounds?: Partial<typeof box.bounds>; customTitle?: string | null; isLocked?: boolean; layout?: typeof box.layout; isMinimized?: boolean }) => {
    dispatch({
      type: 'box.update',
      boxId: box.id,
      updates,
    });
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
          isHovering={isHovering}
          isEditing={isEditing}
          isInteractionLocked={isInteractionLocked}
          inputRef={inputRef}
          toggleLayoutLabel={t('box.toggleLayout')}
          lockPositionLabel={t('box.lockPosition')}
          unlockPositionLabel={t('box.unlockPosition')}
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
          onMinimize={() => dispatch({ type: 'box.update', boxId: box.id, updates: { isMinimized: !box.isMinimized } })}
          onClose={() => dispatch({ type: 'box.delete', boxId: box.id })}
        />
      }
      content={
        <ManagedBoxContent
          box={box}
          showAddMenu={showAddMenu}
          setShowAddMenu={setShowAddMenu}
        />
      }
    />
  );
}
