import { Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { WorkspacePage } from '../../domain/workspace';
import { TabPill } from './TabPill';

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
  return (
    <motion.div
      className={[
        'wbn-recycle-bin-tab',
        highlighted ? 'wbn-box-drop-target' : '',
        released ? 'wbn-box-drop-released' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-page-drop-id={page.id}
      layout="position"
      transition={{ layout: { type: 'spring', stiffness: 460, damping: 38, mass: 0.72 } }}
    >
      <TabPill
        active={active}
        canDelete={false}
        defaultPage={false}
        editing={false}
        icon={<Trash2 size={16} />}
        page={page}
        systemPage
        onActivate={onActivate}
        onDelete={() => undefined}
        onRename={() => undefined}
        onSetDefault={() => undefined}
      />
    </motion.div>
  );
}
