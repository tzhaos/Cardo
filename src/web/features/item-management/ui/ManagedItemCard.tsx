import {
  ClipboardPaste,
  File,
  Folder,
  Link as LinkIcon,
  Pencil,
  Pin,
  PinOff,
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

  return <ClipboardPaste size={iconSize} className="text-file-text" />;
}

export default function ManagedItemCard({
  item,
  layout,
  onUpdate,
  onSetPinned,
  onDelete,
}: ManagedItemCardProps) {
  const controller = useManagedItemCardController({ item, onUpdate, onSetPinned, onDelete });

  const sharedProps = {
    item,
    layout,
    icon: getItemIcon(item, layout),
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
    editIcon: <Pencil size={layout === 'grid' ? 12 : 14} />,
    pinIcon: <Pin size={layout === 'grid' ? 12 : 14} />,
    unpinIcon: <PinOff size={layout === 'grid' ? 12 : 14} />,
    deleteIcon: <X size={layout === 'grid' ? 12 : 14} />,
    onCardClick: controller.openItem,
    onStartEdit: controller.startEdit,
    onEditTitleChange: controller.setEditTitle,
    onEditContentChange: controller.setEditContent,
    onEditorKeyDown: controller.handleEditorKeyDown,
    onSave: controller.handleSave,
    onCancel: controller.handleCancel,
    onTogglePinned: controller.togglePinned,
    onDeleteClick: controller.deleteItem,
  };

  return <ItemCard {...sharedProps} />;
}
