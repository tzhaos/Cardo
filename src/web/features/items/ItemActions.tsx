import { useI18n } from '../../i18n/useI18n';
import { IconButton } from '../../kit/icon-button';
import { ThemeIcon } from '../../kit/icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../kit/dropdown-menu';

/**
 * Item row chrome actions.
 * List mode shows pin / edit / delete; grid collapses edit+delete into a ⋯ menu
 * via CSS (see items.css `.cardo-item-list-grid`).
 */
export function ItemActions({
  pinned = false,
  onPin,
  onEdit,
  onDelete,
}: {
  pinned?: boolean;
  onPin: () => void;
  onEdit?: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="cardo-item-actions">
      <IconButton
        className="cardo-item-pin"
        aria-label={t(pinned ? 'item.unpin' : 'item.pin')}
        pressed={pinned}
        tooltip={t(pinned ? 'item.unpin' : 'item.pin')}
        onClick={onPin}
      >
        {pinned ? <ThemeIcon name="pinOff" size={13} /> : <ThemeIcon name="pin" size={13} />}
      </IconButton>
      {onEdit ? (
        <IconButton
          className="cardo-item-action-edit"
          aria-label={t('item.editContent')}
          tooltip={t('item.editContent')}
          onClick={onEdit}
        >
          <ThemeIcon name="edit" size={13} />
        </IconButton>
      ) : null}
      <IconButton
        className="cardo-item-delete cardo-item-action-delete"
        aria-label={t('item.delete')}
        tooltip={t('item.delete')}
        onClick={onDelete}
      >
        <ThemeIcon name="trash" size={13} />
      </IconButton>
      {/* Grid mode: pin + ⋯ (edit/delete). List mode hides this via CSS. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="cardo-button cardo-button-size-icon cardo-button-ghost cardo-icon-button cardo-item-action-more"
            aria-label={t('item.moreActions')}
            title={t('item.moreActions')}
          >
            <span className="cardo-item-more-glyph" aria-hidden>
              ⋯
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4}>
          {onEdit ? (
            <DropdownMenuItem
              onSelect={() => {
                onEdit();
              }}
            >
              <ThemeIcon name="edit" size={14} />
              <span>{t('item.editContent')}</span>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            className="cardo-menu-row-danger"
            onSelect={() => {
              onDelete();
            }}
          >
            <ThemeIcon name="trash" size={14} />
            <span>{t('item.delete')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
