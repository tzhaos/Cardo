import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useInlineRename } from '../../app/useInlineRename';
import { useUiStore } from '../../app/stores/uiStore';
import { useWorkspaceStore } from '../../app/stores/workspaceStore';
import { getBoxAccent, getBoxIcon } from '../../domain/boxAppearance';
import type { WorkspaceBox } from '../../domain/workspace';
import { isRecycleBinPageId } from '../../domain/workspace';
import { useI18n } from '../../i18n/useI18n';
import { useContextMenu } from '../../kit/context-menu';
import { ThemeIcon } from '../../kit/icon';
import { IconButton } from '../../kit/icon-button';
import { Input } from '../../kit/input';
import { UniversalAddView } from '../boxes/add-views/UniversalAddView';
import { BoxAppearanceIcon } from '../boxes/boxIconRegistry';
import { SortableItemList } from '../items/SortableItemList';
import { GroupBoxDeleteView } from './GroupBoxDeleteView';
import { renderGroupItem } from './renderGroupItem';

const DEFAULT_ITEM_TYPE = 'clipboard' as const;

/**
 * List morphology: group (box) as section + items in a compact grid.
 * Items use the same SortableItemList drag as freeform (reorder + cross-box).
 */
export function GroupListSection({ box }: { box: WorkspaceBox }) {
  const beginBoxDrag = useUiStore((state) => state.beginBoxDrag);
  const selectBox = useUiStore((state) => state.selectBox);
  const openAddView = useUiStore((state) => state.openAddView);
  const draftState = useUiStore((state) => state.addDrafts[box.id]);
  const highlightedBoxId = useUiStore((state) => state.highlightedBoxId);
  const selectedBoxId = useUiStore((state) => state.selectedBoxId);
  const renameBox = useWorkspaceStore((state) => state.renameBox);
  const setBoxLocked = useWorkspaceStore((state) => state.setBoxLocked);
  const deleteBox = useWorkspaceStore((state) => state.deleteBox);
  const addBoxToCollection = useWorkspaceStore((state) => state.addBoxToCollection);
  const removeBoxFromCollection = useWorkspaceStore((state) => state.removeBoxFromCollection);
  const isCollected = useWorkspaceStore((state) =>
    state.projection.collectionBoxIds.includes(box.id),
  );
  const contextMenu = useContextMenu();
  const { t } = useI18n();
  const accent = getBoxAccent(box);
  const icon = getBoxIcon(box);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const permanent = isRecycleBinPageId(box.pageId);
  const titleRename = useInlineRename({
    value: box.title,
    onCommit: (title) => renameBox(box.id, title),
  });

  const beginDrag = (event: ReactPointerEvent<HTMLElement>) => {
    // Primary left button only — ignore right-click / non-primary pointers.
    if (event.button !== 0 || !event.isPrimary) return;
    if (box.isLocked || confirmDelete || titleRename.renaming) return;
    if ((event.target as HTMLElement).closest('button,input,textarea,select,[data-no-drag]')) {
      return;
    }
    event.preventDefault();
    selectBox(box.id);
    // Content/world coords from modeLayouts.list — never viewport getBoundingClientRect.
    const frame = box.modeLayouts.list;
    const rect = event.currentTarget
      .closest<HTMLElement>('[data-canvas-box]')
      ?.getBoundingClientRect();
    let transformOrigin = '50% 20%';
    if (rect) {
      const ox = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
      const oy = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
      transformOrigin = `${ox}% ${oy}%`;
    }
    beginBoxDrag({
      boxId: box.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      startFrame: frame,
      latestFrame: frame,
      transformOrigin,
      morphology: 'list',
    });
  };

  const className = [
    'cardo-group-list-section',
    confirmDelete ? 'cardo-group-list-section-delete-view' : '',
    highlightedBoxId === box.id ? 'cardo-group-list-section-highlighted' : '',
    selectedBoxId === box.id ? 'cardo-group-list-section-selected' : '',
    box.isLocked ? 'cardo-group-list-section-locked' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      className={className}
      data-canvas-box
      data-box-id={box.id}
      data-group-morph="item"
      style={{ ['--box-accent' as string]: accent }}
      onPointerDown={() => selectBox(box.id)}
      onContextMenu={(event) => {
        event.preventDefault();
        if (titleRename.renaming) {
          event.stopPropagation();
          return;
        }
        selectBox(box.id);
        contextMenu.openMenu(event.clientX, event.clientY, [
          {
            id: 'rename',
            label: t('menu.rename'),
            icon: <ThemeIcon name="edit" size={16} />,
            onSelect: () => titleRename.start(),
          },
          {
            id: 'lock',
            label: t(box.isLocked ? 'menu.unlockBox' : 'menu.lockBox'),
            icon: box.isLocked ? (
              <ThemeIcon name="unlock" size={16} />
            ) : (
              <ThemeIcon name="lock" size={16} />
            ),
            onSelect: () => setBoxLocked(box.id, !box.isLocked),
          },
          ...(!permanent
            ? [
                {
                  id: 'collection',
                  label: t(isCollected ? 'menu.removeFromCollection' : 'menu.addToCollection'),
                  icon: isCollected ? (
                    <ThemeIcon name="starOff" size={16} />
                  ) : (
                    <ThemeIcon name="star" size={16} />
                  ),
                  onSelect: () =>
                    isCollected ? removeBoxFromCollection(box.id) : addBoxToCollection(box.id),
                },
              ]
            : []),
          {
            id: 'delete',
            label: t(permanent ? 'menu.deletePermanently' : 'menu.moveToRecycleBin'),
            icon: <ThemeIcon name="trash" size={16} />,
            danger: true,
            onSelect: () => setConfirmDelete(true),
          },
        ]);
      }}
    >
      {confirmDelete ? (
        <GroupBoxDeleteView
          permanent={permanent}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => deleteBox(box.id)}
        />
      ) : (
        <>
          <header className="cardo-group-list-section-header" onPointerDown={beginDrag}>
            <span className="cardo-group-list-grip" aria-hidden="true">
              <ThemeIcon name="grip" size={14} />
            </span>
            <span className="cardo-group-list-section-icon" aria-hidden="true">
              <BoxAppearanceIcon icon={icon} size={14} />
            </span>
            {titleRename.renaming ? (
              <Input
                ref={titleRename.inputRef}
                className="cardo-inline-rename cardo-group-list-section-title-input"
                data-no-drag
                aria-label={t('box.rename', { title: box.title })}
                value={titleRename.draft}
                onChange={(event) => titleRename.setDraft(event.target.value)}
                onBlur={titleRename.commit}
                onKeyDown={titleRename.onKeyDown}
                onContextMenu={titleRename.onContextMenu}
              />
            ) : (
              <strong
                className="cardo-group-list-section-title"
                data-no-drag
                onDoubleClick={() => titleRename.start()}
              >
                {box.title}
              </strong>
            )}
            <span className="cardo-group-list-section-count">{box.items.length}</span>
            <IconButton
              className="cardo-group-list-section-action"
              data-no-drag
              onClick={() => setBoxLocked(box.id, !box.isLocked)}
              aria-label={t(box.isLocked ? 'box.unlock' : 'box.lock')}
              pressed={Boolean(box.isLocked)}
              tooltip={t(box.isLocked ? 'box.unlock' : 'box.lock')}
            >
              {box.isLocked ? (
                <ThemeIcon name="lock" size={13} strokeWidth={2} />
              ) : (
                <ThemeIcon name="unlock" size={13} strokeWidth={2} />
              )}
            </IconButton>
            <IconButton
              className="cardo-group-list-section-action"
              data-no-drag
              aria-label={t('box.addItem')}
              tooltip={t('box.addItem')}
              onClick={() => openAddView(box.id, DEFAULT_ITEM_TYPE)}
            >
              <ThemeIcon name="add" size={14} strokeWidth={2} />
            </IconButton>
            <IconButton
              className="cardo-group-list-section-action cardo-group-list-section-delete"
              data-no-drag
              aria-label={t(permanent ? 'menu.deletePermanently' : 'menu.moveToRecycleBin')}
              tooltip={t(permanent ? 'menu.deletePermanently' : 'menu.moveToRecycleBin')}
              onClick={() => setConfirmDelete(true)}
            >
              <ThemeIcon name="trash" size={13} strokeWidth={2} />
            </IconButton>
          </header>
          {draftState?.mode ? (
            <div className="cardo-group-list-item-host" data-no-box-drag>
              <UniversalAddView boxId={box.id} defaultType={DEFAULT_ITEM_TYPE} />
            </div>
          ) : null}
          {box.items.length ? (
            <div className="cardo-group-list-item-host" data-no-box-drag>
              <SortableItemList
                boxId={box.id}
                items={box.items}
                viewMode="grid"
                renderItem={(item) =>
                  renderGroupItem(box.id, item, draftState?.highlightItemId === item.id)
                }
              />
            </div>
          ) : !draftState?.mode ? (
            <div className="cardo-group-list-section-empty">{t('box.emptyHint')}</div>
          ) : null}
        </>
      )}
    </section>
  );
}
