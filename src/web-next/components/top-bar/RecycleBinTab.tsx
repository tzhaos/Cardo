import { Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { MouseEventHandler } from 'react';
import type { WorkspacePage } from '../../domain/workspace';
import { TabPill } from './TabPill';

interface RecycleBinTabProps {
  page: WorkspacePage;
  active: boolean;
  highlighted: boolean;
  released: boolean;
  onActivate: () => void;
  onContextMenu: MouseEventHandler<HTMLElement>;
}

export function RecycleBinTab({
  page,
  active,
  highlighted,
  released,
  onActivate,
  onContextMenu,
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
      onContextMenu={onContextMenu}
    >
      <TabPill
        active={active}
        icon={<Trash2 size={16} />}
        page={page}
        systemPage
        onActivate={onActivate}
        onRename={() => undefined}
      />
    </motion.div>
  );
}
