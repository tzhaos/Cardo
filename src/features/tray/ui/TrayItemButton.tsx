import { Package } from 'lucide-react';
import { motion } from 'motion/react';
import { useI18n } from '../../../app/hooks/useI18n';
import { getBoxDisplayTitle } from '../../../domains/workspace/model/boxTitles';
import type { WorkspaceBox } from '../../../domains/workspace/model/workspace';
import { cn } from '../../../lib/utils';

interface TrayItemButtonProps {
  box: WorkspaceBox;
  compact?: boolean;
  onClick: () => void;
}

export default function TrayItemButton({ box, compact = false, onClick }: TrayItemButtonProps) {
  const { t } = useI18n();
  const displayTitle = getBoxDisplayTitle(box, t);
  const isVisible = !box.isMinimized;

  return (
    <button
      onClick={onClick}
      className={cn(
        'kb-dock-item relative flex h-10 items-center gap-2 rounded-xl transition-all duration-200',
        'hover:scale-105 active:scale-95',
        compact ? 'w-10 justify-center px-0' : 'px-3',
        isVisible ? 'kb-dock-item-active' : 'bg-transparent',
      )}
      title={displayTitle}
      aria-label={displayTitle}
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-500 shadow-sm">
        <Package size={14} className="text-white/90" />
      </div>

      {!compact && (
        <span className="kb-item-title max-w-[100px] truncate text-sm font-medium">{displayTitle}</span>
      )}

      {isVisible && (
        <motion.div
          layoutId={`active-${box.id}`}
          className={cn(
            'kb-dock-indicator absolute rounded-full bg-slate-500 ring-2 ring-black/10',
            compact ? 'right-1 top-1 h-2.5 w-2.5' : 'right-1.5 top-1.5 h-2 w-2',
          )}
        />
      )}
    </button>
  );
}
