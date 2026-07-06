import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Columns3,
  Inbox,
  LayoutGrid,
  List,
  Lock,
  Package,
  Rocket,
  Unlock,
  X,
} from 'lucide-react';
import type { MouseEvent, PointerEvent, RefObject } from 'react';
import type { WorkspaceBox } from '../../../core/domains/workspace/model/workspace';
import { cn } from '../../lib/utils';

interface BoxHeaderProps {
  box: WorkspaceBox;
  displayTitle: string;
  draftTitle: string;
  isActive: boolean;
  isHovering: boolean;
  isEditing: boolean;
  isInteractionLocked: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  canDrag: boolean;
  canToggleLayout: boolean;
  toggleLayoutLabel: string;
  lockPositionLabel: string;
  unlockPositionLabel: string;
  collapseLabel: string;
  expandLabel: string;
  closeLabel: string;
  onDragStart: (event: PointerEvent<HTMLDivElement>) => void;
  onStartEdit: (event: MouseEvent<HTMLDivElement>) => void;
  onTitleChange: (value: string) => void;
  onFinishEditing: (shouldSave: boolean) => void;
  onToggleLayout: () => void;
  onToggleLock: () => void;
  onToggleCollapse: () => void;
  onClose: () => void;
}

function getBoxIcon(box: WorkspaceBox) {
  if (box.templateId === 'daily-desk') {
    return <CalendarDays size={16} className="shrink-0 text-win-text" strokeWidth={2} />;
  }

  if (box.templateId === 'project-board') {
    return <ClipboardList size={16} className="shrink-0 text-win-text" strokeWidth={2} />;
  }

  if (box.templateId === 'kanban') {
    return <Columns3 size={16} className="shrink-0 text-win-text" strokeWidth={2} />;
  }

  if (box.templateId === 'launcher') {
    return <Rocket size={16} className="shrink-0 text-win-text" strokeWidth={2} />;
  }

  if (box.templateId === 'inbox') {
    return <Inbox size={16} className="shrink-0 text-win-text" strokeWidth={2} />;
  }

  return <Package size={16} className="shrink-0 text-win-text" strokeWidth={2} />;
}

export default function BoxHeader({
  box,
  displayTitle,
  draftTitle,
  isActive,
  isHovering,
  isEditing,
  isInteractionLocked,
  inputRef,
  canDrag,
  canToggleLayout,
  toggleLayoutLabel,
  lockPositionLabel,
  unlockPositionLabel,
  collapseLabel,
  expandLabel,
  closeLabel,
  onDragStart,
  onStartEdit,
  onTitleChange,
  onFinishEditing,
  onToggleLayout,
  onToggleLock,
  onToggleCollapse,
  onClose,
}: BoxHeaderProps) {
  return (
    <div
      className={cn(
        'kb-box-header group flex shrink-0 select-none items-center justify-between p-3 pb-2',
        isEditing || isInteractionLocked || !canDrag
          ? 'cursor-default'
          : 'cursor-grab active:cursor-grabbing',
      )}
      onPointerDown={isEditing || isInteractionLocked || !canDrag ? undefined : onDragStart}
    >
      <div className="flex flex-1 items-center gap-2 overflow-hidden" onDoubleClick={onStartEdit}>
        {getBoxIcon(box)}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={draftTitle}
            onChange={(event) => onTitleChange(event.target.value)}
            onBlur={() => onFinishEditing(true)}
            onKeyDown={(event) => {
              event.stopPropagation();

              if (event.key === 'Enter') {
                onFinishEditing(true);
              }

              if (event.key === 'Escape') {
                onFinishEditing(false);
              }
            }}
            className="kb-box-input w-full truncate rounded-lg border px-2 py-1 text-sm font-medium outline-none transition-colors"
            onPointerDown={(event) => event.stopPropagation()}
            onPaste={(event) => event.stopPropagation()}
            onDragStart={(event) => event.stopPropagation()}
            onDrop={(event) => event.stopPropagation()}
          />
        ) : (
          <span className="kb-box-title pointer-events-none truncate text-sm font-semibold text-win-text">
            {displayTitle}
          </span>
        )}
      </div>

      <div
        className={cn(
          'flex shrink-0 items-center gap-1 transition-opacity duration-200',
          isInteractionLocked ? 'pointer-events-none opacity-0' : '',
          isEditing ? 'pointer-events-none opacity-20' : '',
          !isEditing && (isHovering || isActive) ? 'opacity-100' : !isEditing ? 'opacity-0' : '',
        )}
      >
        {canToggleLayout ? (
          <button
            onClick={onToggleLayout}
            className="kb-icon-button rounded-md p-1.5 transition-colors"
            title={toggleLayoutLabel}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {box.layout === 'grid' ? <List size={14} /> : <LayoutGrid size={14} />}
          </button>
        ) : null}

        <button
          onClick={onToggleLock}
          className="kb-icon-button rounded-md p-1.5 transition-colors"
          title={box.isLocked ? unlockPositionLabel : lockPositionLabel}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {box.isLocked ? <Lock size={14} className="text-red-400" /> : <Unlock size={14} />}
        </button>

        <div className="kb-list-divider mx-1 h-4 w-px" />

        <button
          onClick={onToggleCollapse}
          className="kb-icon-button rounded-md p-1.5 transition-colors"
          title={box.isCollapsed ? expandLabel : collapseLabel}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {box.isCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <button
          onClick={onClose}
          className="kb-icon-button kb-icon-button-danger rounded-md p-1.5 transition-colors"
          title={closeLabel}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
