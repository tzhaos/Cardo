import { Package } from 'lucide-react';
import { motion } from 'motion/react';
import { getBoxDisplayTitle } from '../../../domains/workspace/model/boxTitles';
import { cn } from '../../../lib/utils';
import type { BoxData } from '../../../types/box';

interface TrayItemButtonProps {
  box: BoxData;
  onClick: () => void;
}

function getIconGradient(theme: string) {
  if (theme.includes('blue')) return 'bg-gradient-to-br from-blue-400 to-blue-600';
  if (theme.includes('emerald')) return 'bg-gradient-to-br from-emerald-400 to-emerald-600';
  if (theme.includes('rose')) return 'bg-gradient-to-br from-rose-400 to-rose-600';
  if (theme.includes('amber')) return 'bg-gradient-to-br from-amber-400 to-amber-600';
  if (theme.includes('purple')) return 'bg-gradient-to-br from-purple-400 to-purple-600';
  if (theme.includes('cyan')) return 'bg-gradient-to-br from-cyan-400 to-cyan-600';
  if (theme.includes('fuchsia')) return 'bg-gradient-to-br from-fuchsia-400 to-fuchsia-600';
  if (theme.includes('indigo')) return 'bg-gradient-to-br from-indigo-400 to-indigo-600';
  if (theme.includes('orange')) return 'bg-gradient-to-br from-orange-400 to-orange-600';

  return 'bg-gradient-to-br from-zinc-500 to-zinc-700';
}

export default function TrayItemButton({ box, onClick }: TrayItemButtonProps) {
  const displayTitle = getBoxDisplayTitle(box);

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex h-10 items-center gap-2 rounded-xl px-3 transition-all duration-200',
        'hover:scale-105 hover:bg-white/10 active:scale-95',
        !box.isMinimized ? 'bg-white/10 shadow-inner' : 'bg-transparent',
      )}
      title={displayTitle}
    >
      <div
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-md shadow-sm',
          getIconGradient(box.theme),
        )}
      >
        <Package size={14} className="text-white/90" />
      </div>

      <span className="max-w-[100px] truncate text-sm font-medium text-white/90">
        {displayTitle}
      </span>

      {!box.isMinimized && (
        <motion.div
          layoutId={`active-${box.id}`}
          className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white/80"
        />
      )}
    </button>
  );
}
