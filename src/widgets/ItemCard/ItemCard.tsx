import { Check, Pencil, Pin, PinOff, X } from 'lucide-react';
import { useState } from 'react';
import { useItemActions } from '../../hooks/useItemActions';
import type { BoxItemData } from '../../types/item';

interface ItemCardProps {
  item: BoxItemData;
  layout: 'grid' | 'list';
  icon: React.ReactNode;
  onUpdate: (updates: Partial<BoxItemData>) => void;
  onDelete: () => void;
}

export default function ItemCard({ item, layout, icon, onUpdate, onDelete }: ItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editContent, setEditContent] = useState(item.content);
  const { openItem } = useItemActions();

  const handleSave = (event: React.MouseEvent) => {
    event.stopPropagation();
    onUpdate({ title: editTitle, content: editContent });
    setIsEditing(false);
  };

  if (layout === 'grid') {
    if (isEditing) {
      return (
        <div
          className="group relative flex flex-col items-center gap-2 rounded-xl border border-white/20 bg-white/10 p-3 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            className="w-full rounded-md bg-black/40 px-2 py-1 text-xs font-medium text-white outline-none placeholder:text-white/30 focus:ring-1 focus:ring-white/40"
            placeholder="Title"
            autoFocus
          />
          <input
            value={editContent}
            onChange={(event) => setEditContent(event.target.value)}
            className="w-full rounded-md bg-black/40 px-2 py-1 text-[10px] text-white/70 outline-none placeholder:text-white/30 focus:ring-1 focus:ring-white/40"
            placeholder="Content"
          />
          <div className="mt-1 flex w-full justify-center gap-1.5">
            <button
              onClick={handleSave}
              className="flex flex-1 items-center justify-center rounded-md bg-emerald-500/80 py-1 text-white transition-colors hover:bg-emerald-500"
            >
              <Check size={14} />
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                setIsEditing(false);
              }}
              className="flex flex-1 items-center justify-center rounded-md bg-red-500/80 py-1 text-white transition-colors hover:bg-red-500"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={() => void openItem(item)}
        className="group relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-transparent p-3 transition-all duration-200 hover:border-white/10 hover:bg-white/10 hover:shadow-md"
      >
        <div className="relative rounded-xl bg-black/20 p-2 shadow-inner transition-transform duration-300 group-hover:scale-110">
          {icon}
          {item.isPinned && (
            <div className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-black/50 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
          )}
        </div>
        <span className="w-full break-words px-1 text-center text-xs font-medium leading-tight text-white/90 line-clamp-2">
          {item.title}
        </span>

        <div className="absolute right-1 top-1 z-10 flex flex-col gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onUpdate({ isPinned: !item.isPinned });
            }}
            className="rounded-md border border-white/10 bg-zinc-800/90 p-1.5 text-white/80 shadow-sm backdrop-blur-sm transition-colors hover:bg-zinc-700 hover:text-white"
            title={item.isPinned ? 'Unpin' : 'Pin'}
          >
            {item.isPinned ? <PinOff size={12} /> : <Pin size={12} />}
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              setIsEditing(true);
            }}
            className="rounded-md border border-white/10 bg-zinc-800/90 p-1.5 text-white/80 shadow-sm backdrop-blur-sm transition-colors hover:bg-blue-500/80 hover:text-white"
            title="Edit"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            className="rounded-md border border-white/10 bg-zinc-800/90 p-1.5 text-white/80 shadow-sm backdrop-blur-sm transition-colors hover:bg-red-500/80 hover:text-white"
            title="Delete"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div
        className="flex shrink-0 items-center justify-between rounded-xl border border-white/20 bg-white/10 p-2.5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mr-3 flex w-full flex-col gap-1.5">
          <input
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            className="w-full rounded-md bg-black/40 px-2.5 py-1 text-sm font-medium text-white outline-none placeholder:text-white/30 focus:ring-1 focus:ring-white/40"
            placeholder="Title"
            autoFocus
          />
          <input
            value={editContent}
            onChange={(event) => setEditContent(event.target.value)}
            className="w-full rounded-md bg-black/40 px-2.5 py-1 text-[11px] text-white/70 outline-none placeholder:text-white/30 focus:ring-1 focus:ring-white/40"
            placeholder="Content"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={handleSave}
            className="rounded-lg bg-emerald-500/80 p-2 text-white shadow-sm transition-colors hover:bg-emerald-500"
          >
            <Check size={16} />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              setIsEditing(false);
            }}
            className="rounded-lg bg-red-500/80 p-2 text-white shadow-sm transition-colors hover:bg-red-500"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => void openItem(item)}
      className="group flex shrink-0 cursor-pointer items-center justify-between rounded-xl border border-transparent p-2.5 transition-all duration-200 hover:border-white/5 hover:bg-white/10"
    >
      <div className="flex flex-1 items-center gap-3 overflow-hidden">
        <div className="relative shrink-0 rounded-lg bg-black/20 p-1.5 shadow-inner transition-transform duration-300 group-hover:scale-105">
          {icon}
          {item.isPinned && (
            <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full border border-black/50 bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
          )}
        </div>
        <div className="flex flex-col justify-center overflow-hidden">
          <span className="truncate text-sm font-medium text-white/90">{item.title}</span>
          <span className="mt-0.5 truncate text-[11px] text-white/50">{item.content}</span>
        </div>
      </div>

      <div className="ml-3 flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onUpdate({ isPinned: !item.isPinned });
          }}
          className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white"
          title={item.isPinned ? 'Unpin' : 'Pin to top'}
        >
          {item.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            setIsEditing(true);
          }}
          className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-blue-500/20 hover:text-blue-400"
          title="Edit"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-red-500/20 hover:text-red-400"
          title="Delete"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
