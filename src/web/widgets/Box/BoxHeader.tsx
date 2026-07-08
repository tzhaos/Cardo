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
import type { PointerEvent } from 'react';
import type { WorkspaceBox } from '../../../core/domains/workspace/model/workspace';
import { cn } from '../../lib/utils';

interface BoxHeaderProps {
  box: WorkspaceBox;
  isActive: boolean;
  isHovering: boolean;
  isInteractionLocked: boolean;
  canDrag: boolean;
  canToggleLayout: boolean;
  toggleLayoutLabel: string;
  lockPositionLabel: string;
  unlockPositionLabel: string;
  collapseLabel: string;
  expandLabel: string;
  closeLabel: string;
  onDragStart: (event: PointerEvent<HTMLDivElement>) => void;
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
  isActive,
  isHovering,
  isInteractionLocked,
  canDrag,
  canToggleLayout,
  toggleLayoutLabel,
  lockPositionLabel,
  unlockPositionLabel,
  collapseLabel,
  expandLabel,
  closeLabel,
  onDragStart,
  onToggleLayout,
  onToggleLock,
  onToggleCollapse,
  onClose,
}: BoxHeaderProps) {
  return (
    <div
      className={cn(
        'kb-box-header group flex shrink-0 select-none items-center justify-between p-3 pb-2',
        isInteractionLocked || !canDrag
          ? 'cursor-default'
          : 'cursor-grab active:cursor-grabbing',
      )}
      onPointerDown={isInteractionLocked || !canDrag ? undefined : onDragStart}
    >
      <div className="flex flex-1 items-center gap-2 overflow-hidden">
        {getBoxIcon(box)}
      </div>

      <div
        className={cn(
          'flex shrink-0 items-center gap-1 transition-opacity duration-200',
          isInteractionLocked ? 'pointer-events-none opacity-0' : '',
          isHovering || isActive ? 'opacity-100' : 'opacity-0',
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
