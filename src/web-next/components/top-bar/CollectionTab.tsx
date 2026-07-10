import { Star } from 'lucide-react';
import { motion } from 'motion/react';
import type { WorkspacePage } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { TabPill } from './TabPill';

interface CollectionTabProps {
  page: WorkspacePage;
  active: boolean;
  highlighted: boolean;
  released: boolean;
  onActivate: () => void;
}

export function CollectionTab({
  page,
  active,
  highlighted,
  released,
  onActivate,
}: CollectionTabProps) {
  const { t } = useI18n();
  return (
    <motion.div
      className={[
        'wbn-collection-tab',
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
        icon={<Star size={16} />}
        page={{ ...page, title: t('page.collection') }}
        systemPage
        onActivate={onActivate}
        onDelete={() => undefined}
        onRename={() => undefined}
        onSetDefault={() => undefined}
      />
    </motion.div>
  );
}
