import {
  isKanbanTemplateId,
  type WorkspaceBox,
} from '../../../../core/domains/workspace/model/workspace';
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
}

interface ManagedBoxViewProps {
  box: WorkspaceBox;
}

function ManagedBoxView({ box }: ManagedBoxViewProps) {
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
      box={box}
      isActive={controller.isActive}
      isDragging={controller.isDragging}
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
          displayTitle={controller.displayTitle}
          draftTitle={controller.draftTitle}
          isActive={controller.isActive}
          isHovering={controller.isHovering}
          isEditing={controller.isEditing}
          isInteractionLocked={controller.isInteractionLocked}
          inputRef={controller.inputRef}
          canToggleLayout={!isKanbanTemplateId(box.templateId)}
          toggleLayoutLabel={controller.labels.toggleLayout}
          lockPositionLabel={controller.labels.lockPosition}
          unlockPositionLabel={controller.labels.unlockPosition}
          collapseLabel={controller.labels.collapse}
          expandLabel={controller.labels.expand}
          closeLabel={controller.labels.close}
          onDragStart={controller.handleDragStart}
          onStartEdit={(event) => {
            event.stopPropagation();
            controller.startTitleEdit();
          }}
          onTitleChange={controller.setDraftTitle}
          onFinishEditing={controller.finishTitleEdit}
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

export default function ManagedBox({ boxId }: ManagedBoxProps) {
  const box = useManagedBox(boxId);

  if (!box) {
    return null;
  }

  return <ManagedBoxView box={box} />;
}
