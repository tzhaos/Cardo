import type { MouseEvent, ReactNode } from 'react';
import { Edit2, Pin, PinOff, SquarePen, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';
import { useContextMenu } from '../../ui/khaos/context-menu';

export function useItemContextMenu({
  pinned,
  primaryAction,
  onRename,
  onEdit,
  onPin,
  onDelete,
}: {
  pinned: boolean;
  primaryAction: { label: string; icon: ReactNode; onSelect: () => void };
  onRename?: () => void;
  onEdit: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const { openMenu, menu } = useContextMenu();
  const { t } = useI18n();

  return {
    menu,
    onContextMenu: (event: MouseEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      openMenu(event.clientX, event.clientY, [
        {
          id: 'primary',
          label: primaryAction.label,
          icon: primaryAction.icon,
          onSelect: primaryAction.onSelect,
        },
        ...(onRename
          ? [
              {
                id: 'rename',
                label: t('item.rename'),
                icon: <SquarePen size={16} />,
                onSelect: onRename,
              },
            ]
          : []),
        {
          id: 'edit',
          label: t('item.editContent'),
          icon: <Edit2 size={16} />,
          onSelect: onEdit,
        },
        {
          id: 'pin',
          label: t(pinned ? 'item.unpin' : 'item.pin'),
          icon: pinned ? <PinOff size={16} /> : <Pin size={16} />,
          onSelect: onPin,
        },
        {
          id: 'delete',
          label: t('item.delete'),
          icon: <Trash2 size={16} />,
          danger: true,
          onSelect: onDelete,
        },
      ]);
    },
  };
}
