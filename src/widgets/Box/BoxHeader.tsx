import { LayoutGrid, List, Lock, Minus, Package, Unlock, X } from 'lucide-react';
import type { RefObject } from 'react';
import type { WorkspaceBox } from '../../domains/workspace/model/workspace';
import { cn } from '../../lib/utils';

interface BoxHeaderProps {
  box: WorkspaceBox;
  displayTitle: string;
  draftTitle: string;
  isHovering: boolean;
  isEditing: boolean;
  isInteractionLocked: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  toggleLayoutLabel: string;
  lockPositionLabel: string;
  unlockPositionLabel: string;
  minimizeLabel: string;
  closeLabel: string;
  onDragStart: (event: React.PointerEvent) => void;
  onStartEdit: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTitleChange: (value: string) => void;
  onFinishEditing: (shouldSave: boolean) => void;
  onToggleLayout: () => void;
  onToggleLock: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

export default function BoxHeader({
  box,
  displayTitle,
  draftTitle,
  isHovering,
  isEditing,
  isInteractionLocked,
  inputRef,
  toggleLayoutLabel,
  lockPositionLabel,
  unlockPositionLabel,
  minimizeLabel,
  closeLabel,
  onDragStart,
  onStartEdit,
  onTitleChange,
  onFinishEditing,
  onToggleLayout,
  onToggleLock,
  onMinimize,
  onClose,
}: BoxHeaderProps) {
  return (
    <div
      className={cn(
        'kb-box-header group flex h-10 shrink-0 select-none items-center justify-between border-b px-3',
        isEditing || isInteractionLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
      )}
      onPointerDown={isEditing || isInteractionLocked ? undefined : onDragStart}
    >
      <div className="flex flex-1 items-center gap-2 overflow-hidden" onDoubleClick={onStartEdit}>
        <Package size={14} className="kb-box-muted shrink-0" />
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
          <span className="kb-box-title pointer-events-none truncate px-1 text-sm font-medium">
            {displayTitle}
          </span>
        )}
      </div>

      <div
        className={cn(
          'flex shrink-0 items-center gap-1 transition-opacity duration-200',
          isInteractionLocked ? 'pointer-events-none opacity-0' : '',
          isEditing ? 'pointer-events-none opacity-20' : '',
          !isEditing && isHovering ? 'opacity-100' : !isEditing ? 'opacity-0' : '',
        )}
      >
        <button
          onClick={onToggleLayout}
          className="kb-icon-button rounded-md p-1.5 transition-colors"
          title={toggleLayoutLabel}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {box.layout === 'grid' ? <List size={14} /> : <LayoutGrid size={14} />}
        </button>

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
          onClick={onMinimize}
          className="kb-icon-button rounded-md p-1.5 transition-colors"
          title={minimizeLabel}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Minus size={14} />
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
