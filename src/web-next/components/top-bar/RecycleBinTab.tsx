import { Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { WorkspacePage } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';

interface RecycleBinTabProps {
  page: WorkspacePage;
  active: boolean;
  highlighted: boolean;
  released: boolean;
  onActivate: () => void;
}

export function RecycleBinTab({
  page,
  active,
  highlighted,
  released,
  onActivate,
}: RecycleBinTabProps) {
  const { t } = useI18n();

  return (
    <motion.div
      className={[
        'wbn-recycle-bin-tab',
        active ? 'wbn-recycle-bin-tab-active' : '',
        highlighted ? 'wbn-box-drop-target' : '',
        released ? 'wbn-box-drop-released' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-page-drop-id={page.id}
      layout="position"
      transition={{ layout: { type: 'spring', stiffness: 460, damping: 38, mass: 0.72 } }}
    >
      <button
        type="button"
        aria-current={active ? 'page' : undefined}
        aria-label={t('page.recycleBin')}
        onClick={onActivate}
      >
        <AnimatePresence initial={false}>
          {active ? (
            <motion.span
              className="wbn-active-tab-indicator"
              layoutId="active-tab-indicator"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', bounce: 0.16, duration: 0.52 }}
            />
          ) : null}
        </AnimatePresence>
        <Trash2 size={15} />
      </button>
    </motion.div>
  );
}
