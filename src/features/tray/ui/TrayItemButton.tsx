import { Package } from 'lucide-react';
import { motion } from 'motion/react';
import { useI18n } from '../../../app/hooks/useI18n';
import { getBoxThemeDockIconClass } from '../../../domains/workspace/model/boxThemes';
import { getBoxDisplayTitle } from '../../../domains/workspace/model/boxTitles';
import type { WorkspaceBox } from '../../../domains/workspace/model/workspace';
import { cn } from '../../../lib/utils';

interface TrayItemButtonProps {
  box: WorkspaceBox;
  onClick: () => void;
}

export default function TrayItemButton({ box, onClick }: TrayItemButtonProps) {
  const { t } = useI18n();
  const displayTitle = getBoxDisplayTitle(box, t);

  return (
    <button
      onClick={onClick}
      className={cn(
        'kb-dock-item relative flex h-10 items-center gap-2 rounded-xl px-3 transition-all duration-200',
        'hover:scale-105 active:scale-95',
        !box.isMinimized ? 'kb-dock-item-active shadow-inner' : 'bg-transparent',
      )}
      title={displayTitle}
    >
      <div
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-md shadow-sm',
          getBoxThemeDockIconClass(box.theme),
        )}
      >
        <Package size={14} className="text-white/90" />
      </div>

      <span className="kb-item-title max-w-[100px] truncate text-sm font-medium">{displayTitle}</span>

      {!box.isMinimized && (
        <motion.div
          layoutId={`active-${box.id}`}
          className="kb-dock-indicator absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
        />
      )}
    </button>
  );
}
