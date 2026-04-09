import { Package } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
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
        'kb-dock-item relative flex h-10 items-center gap-2 rounded-lg transition-all duration-200 active:scale-95',
        compact ? 'w-10 justify-center px-0' : 'px-4',
        isVisible ? 'kb-dock-item-active bg-win-hover' : 'hover:bg-win-hover',
      )}
      title={displayTitle}
      aria-label={displayTitle}
    >
      <Package
        size={16}
        strokeWidth={2}
        className="text-win-text"
      />

      {!compact && (
        <span
          className={cn(
            'max-w-[100px] truncate text-sm font-medium',
            isVisible ? 'text-win-text' : 'text-win-text-secondary',
          )}
        >
          {displayTitle}
        </span>
      )}

      <AnimatePresence initial={false}>
        {isVisible && (
          <motion.div
            layoutId={`dock-indicator-${box.id}`}
            initial={{ opacity: 0, scaleX: 0.65, y: 2 }}
            animate={{
              opacity: 1,
              scaleX: 1,
              y: 0,
              transition: {
                type: 'spring',
                stiffness: 520,
                damping: 32,
                mass: 0.7,
              },
            }}
            exit={{
              opacity: 0,
              scaleX: 0.65,
              y: 2,
              transition: {
                duration: 0.14,
                ease: 'easeOut',
              },
            }}
            className={cn(
              'kb-dock-indicator absolute left-1/2 -translate-x-1/2 rounded-full bg-win-accent',
              compact ? 'bottom-0 h-1 w-3.5' : 'bottom-0 h-1 w-4',
            )}
          />
        )}
      </AnimatePresence>
    </button>
  );
}
