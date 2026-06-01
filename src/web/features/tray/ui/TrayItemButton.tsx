import { Package } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { WorkspaceBox } from '../../../../core/domains/workspace/model/workspace';
import { cn } from '../../../lib/utils';
import { useTrayItemState } from '../hooks/useTrayItemState';

interface TrayItemButtonProps {
  box: WorkspaceBox;
  compact?: boolean;
  onClick: () => void;
}

export default function TrayItemButton({ box, compact = false, onClick }: TrayItemButtonProps) {
  const { displayTitle, isLaunchingBox, isReceivingBox, isTransitioning, isVisible } =
    useTrayItemState(box);

  return (
    <motion.button
      id={`dock-box-${box.id}`}
      onClick={onClick}
      animate={{
        scale: isReceivingBox ? [1, 1.03, 1] : isLaunchingBox ? [1, 0.98, 1] : 1,
        y: isReceivingBox ? [0, -1, 0] : isLaunchingBox ? [0, 1, 0] : 0,
      }}
      transition={{
        duration: isReceivingBox ? 0.2 : isLaunchingBox ? 0.24 : 0.16,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(
        'kb-dock-item relative flex h-10 items-center gap-2 rounded-lg transition-all duration-200 active:scale-95',
        compact ? 'w-10 justify-center px-0' : 'px-4',
        isVisible || isReceivingBox
          ? 'kb-dock-item-active bg-win-hover'
          : isLaunchingBox
            ? 'bg-win-hover'
            : 'hover:bg-win-hover',
      )}
      title={displayTitle}
      aria-label={displayTitle}
    >
      <AnimatePresence initial={false}>
        {isTransitioning ? (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-lg bg-white/5"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: isReceivingBox ? [0, 0.18, 0] : [0, 0.12, 0],
              scale: isReceivingBox ? [0.9, 1.02, 1.06] : [0.92, 1.03, 1.06],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: isReceivingBox ? 0.24 : 0.26,
              ease: [0.2, 1, 0.3, 1],
            }}
          />
        ) : null}
      </AnimatePresence>

      <motion.div
        animate={{
          y: isReceivingBox ? [0, -0.5, 0] : isLaunchingBox ? [0, 1, 0] : 0,
          scale: isTransitioning ? 1.04 : 1,
        }}
        transition={{ duration: isTransitioning ? 0.2 : 0.18, ease: [0.16, 1, 0.3, 1] }}
      >
        <Package size={16} strokeWidth={2} className="text-win-text" />
      </motion.div>

      {!compact && (
        <motion.span
          animate={{
            opacity: isTransitioning ? 0 : isVisible ? 1 : 0.68,
            x: isTransitioning ? -3 : 0,
            scale: isTransitioning ? 0.96 : 1,
          }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'max-w-[100px] truncate text-sm font-medium',
            isVisible ? 'text-win-text' : 'text-win-text-secondary',
          )}
        >
          {displayTitle}
        </motion.span>
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
    </motion.button>
  );
}
