import { LayoutGrid, List, Lock, Minus, Package, Unlock, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { BoxData } from '../../types/box';
import { cn } from '../../lib/utils';
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
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing || !inputRef.current) {
      return;
    }

    inputRef.current.focus();
    inputRef.current.select();
  }, [isEditing]);

  return (
    <div
      className="group flex h-10 shrink-0 select-none items-center justify-between border-b border-white/10 px-3 active:cursor-grabbing cursor-grab"
      onPointerDown={onDragStart}
    >
      <div
        className="flex flex-1 items-center gap-2 overflow-hidden"
        onDoubleClick={(event) => {
          event.stopPropagation();
          setIsEditing(true);
        }}
      >
        <Package size={14} className="shrink-0 text-white/60" />
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={data.title}
            onChange={(event) => onUpdate({ title: event.target.value })}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === 'Escape') {
                setIsEditing(false);
              }
            }}
            className="w-full truncate rounded border-none bg-black/20 px-1 text-sm font-medium text-white/90 outline-none focus:ring-1 focus:ring-white/20"
            onPointerDown={(event) => event.stopPropagation()}
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
          isHovering ? 'opacity-100' : 'opacity-0',
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
