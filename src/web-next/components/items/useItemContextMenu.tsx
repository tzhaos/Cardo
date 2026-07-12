import type { MouseEvent, ReactNode } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { useContextMenu } from '../../ui/cardo/context-menu';
import { ThemeIcon } from '../../ui/icons/ThemeIcon';

/**
 * Item right-click is always available — many actions have no other entry.
 * Not gated by Feature Catalog.
 */
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
  const { openMenu } = useContextMenu();
  const { t } = useI18n();

  return {
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
                icon: <ThemeIcon name="edit" size={16} />,
                onSelect: onRename,
              },
            ]
          : []),
        {
          id: 'edit',
          label: t('item.editContent'),
          icon: <ThemeIcon name="edit" size={16} />,
          onSelect: onEdit,
        },
        {
          id: 'pin',
          label: t(pinned ? 'item.unpin' : 'item.pin'),
          icon: pinned ? <ThemeIcon name="pinOff" size={16} /> : <ThemeIcon name="pin" size={16} />,
          onSelect: onPin,
        },
        {
          id: 'delete',
          label: t('item.delete'),
          icon: <ThemeIcon name="trash" size={16} />,
          danger: true,
          onSelect: onDelete,
        },
      ]);
    },
  };
}
