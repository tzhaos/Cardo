import { LayoutGrid, List, Lock, Minus, Package, Unlock, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '../../domains/ui/store/useUIStore';
import { cn } from '../../lib/utils';
import type { BoxData } from '../../types/box';
import BoxThemePicker from './BoxThemePicker';

interface BoxHeaderProps {
  data: BoxData;
  isHovering: boolean;
  showThemePicker: boolean;
  setShowThemePicker: (show: boolean) => void;
  onUpdate: (updates: Partial<BoxData>) => void;
  onMinimize: () => void;
  onClose: () => void;
  onDragStart: (event: React.PointerEvent) => void;
}

export default function BoxHeader({
  data,
  isHovering,
  showThemePicker,
  setShowThemePicker,
  onUpdate,
  onMinimize,
  onClose,
  onDragStart,
}: BoxHeaderProps) {
  const editorId = `box:${data.id}:title`;
  const editingSessionId = useUIStore((state) => state.editingSessionId);
  const setEditingSessionId = useUIStore((state) => state.setEditingSessionId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draftTitle, setDraftTitle] = useState(data.title);

  const isEditing = editingSessionId === editorId;
  const isInteractionLocked = Boolean(editingSessionId && editingSessionId !== editorId);

  useEffect(() => {
    if (!isEditing || !inputRef.current) {
      return;
    }

    inputRef.current.focus();
    inputRef.current.select();
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    setDraftTitle(data.title);
  }, [data.title, isEditing]);

  useEffect(
    () => () => {
      const state = useUIStore.getState();

      if (state.editingSessionId === editorId) {
        state.setEditingSessionId(null);
      }
    },
    [editorId],
  );

  const finishEditing = (shouldSave: boolean) => {
    if (shouldSave) {
      const nextTitle = draftTitle.trim();

      if (nextTitle && nextTitle !== data.title) {
        onUpdate({ title: nextTitle });
      }
    } else {
      setDraftTitle(data.title);
    }

    if (useUIStore.getState().editingSessionId === editorId) {
      setEditingSessionId(null);
    }
  };

  return (
    <div
      className={cn(
        'group flex h-10 shrink-0 select-none items-center justify-between border-b border-white/10 px-3',
        isEditing || isInteractionLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
      )}
      onPointerDown={isEditing || isInteractionLocked ? undefined : onDragStart}
    >
      <div
        className="flex flex-1 items-center gap-2 overflow-hidden"
        onDoubleClick={(event) => {
          event.stopPropagation();

          if (isInteractionLocked) {
            return;
          }

          setDraftTitle(data.title);
          setEditingSessionId(editorId);
        }}
      >
        <Package size={14} className="shrink-0 text-white/60" />
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={() => finishEditing(true)}
            onKeyDown={(event) => {
              event.stopPropagation();

              if (event.key === 'Enter') {
                finishEditing(true);
              }

              if (event.key === 'Escape') {
                finishEditing(false);
              }
            }}
            className="w-full truncate rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm font-medium text-white/90 outline-none transition-colors focus:border-white/20 focus:ring-2 focus:ring-white/15"
            onPointerDown={(event) => event.stopPropagation()}
            onPaste={(event) => event.stopPropagation()}
            onDragStart={(event) => event.stopPropagation()}
            onDrop={(event) => event.stopPropagation()}
          />
        ) : (
          <span className="truncate px-1 text-sm font-medium text-white/90 pointer-events-none">
            {data.title}
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
        <BoxThemePicker
          showThemePicker={showThemePicker}
          setShowThemePicker={setShowThemePicker}
          onUpdate={(theme) => onUpdate({ theme })}
        />

        <button
          onClick={() => onUpdate({ layout: data.layout === 'grid' ? 'list' : 'grid' })}
          className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          title="Toggle Layout"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {data.layout === 'grid' ? <List size={14} /> : <LayoutGrid size={14} />}
        </button>

        <button
          onClick={() => onUpdate({ isLocked: !data.isLocked })}
          className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          title={data.isLocked ? 'Unlock Position' : 'Lock Position'}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {data.isLocked ? <Lock size={14} className="text-red-400" /> : <Unlock size={14} />}
        </button>

        <div className="mx-1 h-4 w-px bg-white/20" />

        <button
          onClick={onMinimize}
          className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          title="Minimize"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Minus size={14} />
        </button>

        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-white/60 transition-colors hover:bg-red-500/20 hover:text-red-400"
          title="Close Box"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
