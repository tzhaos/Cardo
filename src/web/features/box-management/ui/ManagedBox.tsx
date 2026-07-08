import {
  isKanbanTemplateId,
  type WorkspaceBox,
} from '../../../../core/domains/workspace/model/workspace';
import type { PointerEvent } from 'react';
import BoxContainer from '../../../widgets/Box/BoxContainer';
import BoxHeader from '../../../widgets/Box/BoxHeader';
import {
  ManagedBoxContent,
  ManagedBookmarkCollectionContent,
  ManagedInboxContent,
  ManagedKanbanContent,
} from '../../item-management';
import { useManagedBox, useManagedBoxController } from '../hooks/useManagedBoxController';

interface ManagedBoxProps {
  boxId: string;
  placement?: 'canvas' | 'columns';
  isMasonryDragging?: boolean;
  onMasonryDragStart?: (event: PointerEvent<HTMLDivElement>, box: WorkspaceBox) => void;
}

interface ManagedBoxViewProps {
  box: WorkspaceBox;
  placement: 'canvas' | 'columns';
  isMasonryDragging: boolean;
  onMasonryDragStart?: (event: PointerEvent<HTMLDivElement>, box: WorkspaceBox) => void;
}

function ManagedBoxView({
  box,
  placement,
  isMasonryDragging,
  onMasonryDragStart,
}: ManagedBoxViewProps) {
  const controller = useManagedBoxController(box);
  const content = isKanbanTemplateId(box.templateId) ? (
    <ManagedKanbanContent box={box} />
  ) : box.templateId === 'web-library' ? (
    <ManagedBookmarkCollectionContent box={box} mode="library" />
  ) : box.templateId === 'frequent-sites' ? (
    <ManagedBookmarkCollectionContent box={box} mode="frequent" />
  ) : box.templateId === 'inbox' ? (
    <ManagedInboxContent
      box={box}
      showAddMenu={controller.showAddMenu}
      setShowAddMenu={controller.setShowAddMenu}
    />
  ) : (
    <ManagedBoxContent
      box={box}
      showAddMenu={controller.showAddMenu}
      setShowAddMenu={controller.setShowAddMenu}
    />
  );

  return (
    <BoxContainer
      placement={placement}
      box={box}
      isActive={controller.isActive}
      isDragging={controller.isDragging}
      isMasonryDragging={isMasonryDragging}
      editingSessionId={controller.editingSessionId}
      onFocus={controller.focusBox}
      onMouseEnter={controller.handleMouseEnter}
      onMouseLeave={controller.handleMouseLeave}
      onResizeStart={controller.handleResize}
      isCanvasTransforming={controller.isCanvasTransforming}
      isPanModifierActive={controller.isPanModifierActive}
      camera={controller.camera}
      header={
        <BoxHeader
          box={box}
          isActive={controller.isActive}
          isHovering={controller.isHovering}
          isInteractionLocked={controller.isInteractionLocked}
          canDrag={placement === 'canvas' || Boolean(onMasonryDragStart)}
          canToggleLayout={!isKanbanTemplateId(box.templateId)}
          toggleLayoutLabel={controller.labels.toggleLayout}
          lockPositionLabel={controller.labels.lockPosition}
          unlockPositionLabel={controller.labels.unlockPosition}
          collapseLabel={controller.labels.collapse}
          expandLabel={controller.labels.expand}
          closeLabel={controller.labels.close}
          onDragStart={(event) => {
            if (placement === 'columns' && onMasonryDragStart) {
              onMasonryDragStart(event, box);
              return;
            }

            controller.handleDragStart(event);
          }}
          onToggleLayout={controller.toggleLayout}
          onToggleLock={controller.toggleLock}
          onToggleCollapse={controller.toggleCollapse}
          onClose={controller.close}
        />
      }
      content={content}
    />
  );
}

export default function ManagedBox({
  boxId,
  placement = 'canvas',
  isMasonryDragging = false,
  onMasonryDragStart,
}: ManagedBoxProps) {
  const box = useManagedBox(boxId);

  if (!box) {
    return null;
  }

  return (
    <ManagedBoxView
      box={box}
      placement={placement}
      isMasonryDragging={isMasonryDragging}
      onMasonryDragStart={onMasonryDragStart}
    />
  );
}
