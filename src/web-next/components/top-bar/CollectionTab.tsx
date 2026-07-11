import { Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback } from 'react';
import type { MouseEventHandler } from 'react';
import { registerPageDropElement } from '../../app/interactionElementRegistry';
import { useUiStore } from '../../app/stores/uiStore';
import type { WorkspacePage } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { TabPill } from './TabPill';

interface CollectionTabProps {
  page: WorkspacePage;
  active: boolean;
  highlighted: boolean;
  released: boolean;
  onActivate: () => void;
  onContextMenu: MouseEventHandler<HTMLElement>;
}

export function CollectionTab({
  page,
  active,
  highlighted,
  released,
  onActivate,
  onContextMenu,
}: CollectionTabProps) {
  const { t } = useI18n();
  const boxDragActive = useUiStore((state) => Boolean(state.draggedBoxId));
  const registerDropElement = useCallback(
    (element: HTMLDivElement | null) => registerPageDropElement(page.id, element),
    [page.id],
  );
  return (
    <motion.div
      ref={registerDropElement}
      className={[
        'wbn-collection-tab',
        highlighted ? 'wbn-box-drop-target' : '',
        released ? 'wbn-box-drop-released' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-page-drop-id={page.id}
      layout="position"
      transition={{
        layout: boxDragActive
          ? { type: 'tween', duration: 0 }
          : { type: 'spring', stiffness: 460, damping: 38, mass: 0.72 },
      }}
      onContextMenu={onContextMenu}
    >
      <TabPill
        active={active}
        icon={<Star size={16} />}
        page={{ ...page, title: t('page.collection') }}
        systemPage
        onActivate={onActivate}
        onRename={() => undefined}
      />
    </motion.div>
  );
}
