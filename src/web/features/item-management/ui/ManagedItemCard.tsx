import {
  ClipboardPaste,
  File,
  Folder,
  Link as LinkIcon,
  Pencil,
  Pin,
  PinOff,
  Rocket,
  Star,
  X,
} from 'lucide-react';
import type {
  PlacedWorkspaceItem,
  WorkspaceItem,
  WorkspaceItemUpdate,
} from '../../../../core/domains/items/model/item';
import ItemCard from '../../../widgets/ItemCard/ItemCard';
import { useManagedItemCardController } from '../hooks/useManagedItemCardController';

interface ManagedItemCardProps {
  boxId: string;
  item: PlacedWorkspaceItem;
  layout: 'grid' | 'list';
  onUpdate: (updates: WorkspaceItemUpdate) => void;
  onSetPinned: (isPinned: boolean) => void;
  onDelete: () => void;
}

function getItemIcon(item: WorkspaceItem, layout: 'grid' | 'list') {
  const iconSize = layout === 'grid' ? 24 : 16;

  if (item.type === 'folder') {
    return (
      <Folder
        size={iconSize}
        className="text-folder-text fill-folder-fill"
        fill="currentColor"
        fillOpacity={1}
      />
    );
  }

  if (item.type === 'file') {
    return <File size={iconSize} className="text-file-text" />;
  }

  if (item.type === 'url') {
    return <LinkIcon size={iconSize} className="text-[var(--role-link-fg)]" />;
  }

  if (item.type === 'shortcut') {
    return <Rocket size={iconSize} className="text-[var(--role-generic-fg)]" />;
  }

  return <ClipboardPaste size={iconSize} className="text-file-text" />;
}

export default function ManagedItemCard({
  boxId,
  item,
  layout,
  onUpdate,
  onSetPinned,
  onDelete,
}: ManagedItemCardProps) {
  const controller = useManagedItemCardController({
    boxId,
    item,
    onUpdate,
    onSetPinned,
    onDelete,
  });

  const sharedProps = {
    item,
    layout,
    icon: getItemIcon(item, layout),
    isFocused: controller.isFocused,
    isEditing: controller.isEditing,
    isInteractionLocked: controller.isInteractionLocked,
    editTitle: controller.editTitle,
    editContent: controller.editContent,
    editorRootRef: controller.editorRootRef,
    titleInputRef: controller.titleInputRef,
    editorLabel: controller.labels.editor,
    contentPlaceholder: controller.labels.contentPlaceholder,
    titlePlaceholder: controller.labels.titlePlaceholder,
    saveLabel: controller.labels.save,
    cancelLabel: controller.labels.cancel,
    pinLabel: controller.labels.pin,
    pinToTopLabel: controller.labels.pinToTop,
    unpinLabel: controller.labels.unpin,
    editLabel: controller.labels.edit,
    deleteLabel: controller.labels.delete,
    addBookmarkLabel: controller.labels.addBookmark,
    removeBookmarkLabel: controller.labels.removeBookmark,
    editIcon: <Pencil size={layout === 'grid' ? 12 : 14} />,
    pinIcon: <Pin size={layout === 'grid' ? 12 : 14} />,
    unpinIcon: <PinOff size={layout === 'grid' ? 12 : 14} />,
    bookmarkIcon: <Star size={layout === 'grid' ? 12 : 14} />,
    deleteIcon: <X size={layout === 'grid' ? 12 : 14} />,
    isBookmarked: controller.isBookmarked,
    onCardClick: controller.openItem,
    onStartEdit: controller.startEdit,
    onEditTitleChange: controller.setEditTitle,
    onEditContentChange: controller.setEditContent,
    onEditorKeyDown: controller.handleEditorKeyDown,
    onSave: controller.handleSave,
    onCancel: controller.handleCancel,
    onTogglePinned: controller.togglePinned,
    onToggleBookmark: controller.toggleBookmark,
    onDeleteClick: controller.deleteItem,
  };

  return (
    <div ref={controller.rootRef} data-kb-item-id={item.id}>
      <ItemCard {...sharedProps} />
    </div>
  );
}
