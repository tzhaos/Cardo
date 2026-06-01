import type { WorkspaceBox } from '../../../../core/domains/workspace/model/workspace';
import BoxContainer from '../../../widgets/Box/BoxContainer';
import BoxHeader from '../../../widgets/Box/BoxHeader';
import { ManagedBoxContent } from '../../item-management';
import { useManagedBox, useManagedBoxController } from '../hooks/useManagedBoxController';

interface ManagedBoxProps {
  boxId: string;
}

interface ManagedBoxViewProps {
  box: WorkspaceBox;
}

function ManagedBoxView({ box }: ManagedBoxViewProps) {
  const controller = useManagedBoxController(box);

  return (
    <BoxContainer
      box={box}
      isActive={controller.isActive}
      isDragging={controller.isDragging}
      transitionKind={controller.transitionKind}
      transitionDockRect={controller.transitionDockRect}
      editingSessionId={controller.editingSessionId}
      onFocus={controller.focusBox}
      onMouseEnter={controller.handleMouseEnter}
      onMouseLeave={controller.handleMouseLeave}
      onResizeStart={controller.handleResize}
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
          toggleLayoutLabel={controller.labels.toggleLayout}
          lockPositionLabel={controller.labels.lockPosition}
          unlockPositionLabel={controller.labels.unlockPosition}
          collapseLabel={controller.labels.collapse}
          expandLabel={controller.labels.expand}
          minimizeLabel={controller.labels.minimize}
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
          onMinimize={controller.minimize}
          onClose={controller.close}
        />
      }
      content={
        <ManagedBoxContent
          box={box}
          showAddMenu={controller.showAddMenu}
          setShowAddMenu={controller.setShowAddMenu}
        />
      }
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
