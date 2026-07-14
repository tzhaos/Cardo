import { useEffect, useMemo, useState } from 'react';
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { useUiStore } from '../app/stores/uiStore';
import { useWorkspaceStore } from '../app/stores/workspaceStore';
import { useInlineRename } from '../app/useInlineRename';
import { Input } from '../kit/input';
import { IconButton } from '../kit/icon-button';
import { NavItem, SectionLabel } from '../kit/nav-item';
import { ThemeIcon } from '../kit/icon';
import { useContextMenu } from '../kit/context-menu';
import {
  isCollectionPageId,
  isRecycleBinPageId,
  isSystemPageId,
  type WorkspacePage,
} from '../domain/workspace';
import { useI18n } from '../i18n/useI18n';
import { useFeatureEnabled } from './FeatureGate';
import { PageDeleteConfirmRow } from '../features/pages/PageDeleteConfirmRow';
import {
  sidebarNavItemClassName,
  sidebarPageDropRowClassName,
  usePageDropElementRef,
  useSidebarBoxDropUi,
} from './SidebarPageDropBridge';

const PAGE_REORDER_MIME = 'application/x-cardo-page-id';

/**
 * Product page nav (primary nav / sidebar): new page · favorites · flat pages · recycle bin.
 * Parent FeatureGate chrome.sidebar (CardoApp); settings foot is outside the gate.
 * Collection / recycle / multiPage use workspace.* features.
 * Rename + delete+confirm + user-page reorder (multiPage).
 *
 * PR7 box drop: each page/system row registers via registerPageDropElement.
 * Primary nav hit region is registered in CardoApp (registerTopBarElement name kept).
 * Rules stay in shared BoxPageDropController — do not fork cases here.
 */
export function SidebarNav() {
  const showCollection = useFeatureEnabled('workspace.collection');
  const showRecycleBin = useFeatureEnabled('workspace.recycleBin');
  const multiPage = useFeatureEnabled('workspace.multiPage');
  const persistedPageRows = useWorkspaceStore((state) => state.projection.pages);
  const activePageId = useWorkspaceStore((state) => state.projection.activePageId);
  const defaultPageId = useWorkspaceStore((state) => state.projection.defaultPageId);
  const createPage = useWorkspaceStore((state) => state.createPage);
  const renamePage = useWorkspaceStore((state) => state.renamePage);
  const deletePage = useWorkspaceStore((state) => state.deletePage);
  const setActivePage = useWorkspaceStore((state) => state.setActivePage);
  const setDefaultPage = useWorkspaceStore((state) => state.setDefaultPage);
  const reorderPages = useWorkspaceStore((state) => state.reorderPages);
  const globalSearchEnabled = useFeatureEnabled('chrome.globalSearch');
  const searchOpen = useUiStore((state) => state.searchOpen);
  const openSearch = useUiStore((state) => state.openSearch);
  const closeSearch = useUiStore((state) => state.closeSearch);
  const { dropPageId } = useSidebarBoxDropUi();
  const [deletePageId, setDeletePageId] = useState<string | null>(null);
  const [renamePageId, setRenamePageId] = useState<string | null>(null);
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null);
  const [reorderHover, setReorderHover] = useState<{
    pageId: string;
    insertAfter: boolean;
  } | null>(null);
  const contextMenu = useContextMenu();
  const { t } = useI18n();

  const persistedPages = useMemo(
    () => [...persistedPageRows].sort((first, second) => first.order - second.order),
    [persistedPageRows],
  );
  const workspacePages = useMemo(
    () => persistedPages.filter((page) => !isSystemPageId(page.id)),
    [persistedPages],
  );
  const collectionPage = useMemo(
    () => persistedPages.find((page) => isCollectionPageId(page.id)),
    [persistedPages],
  );
  const recycleBinPage = useMemo(
    () => persistedPages.find((page) => isRecycleBinPageId(page.id)),
    [persistedPages],
  );
  const visibleUserPages = useMemo(() => {
    if (multiPage) return workspacePages;
    // Single-group mode: keep one user page visible even on system pages so nav is not a dead end.
    const activeUser = workspacePages.find((page) => page.id === activePageId);
    if (activeUser) return [activeUser];
    const fallback = workspacePages.find((page) => page.id === defaultPageId) ?? workspacePages[0];
    return fallback ? [fallback] : [];
  }, [activePageId, defaultPageId, multiPage, workspacePages]);

  const pageToDelete = workspacePages.find((page) => page.id === deletePageId);
  const deleteBoxCount = useWorkspaceStore(
    (state) => state.projection.boxes.filter((box) => box.pageId === deletePageId).length,
  );

  useEffect(() => {
    if (!deletePageId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDeletePageId(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      // Stay open when interacting with the confirm row; cancel on other chrome.
      if (!target?.closest('[data-sidebar-delete-row]')) {
        setDeletePageId(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [deletePageId]);

  const openNewPage = () => createPage(t('page.untitled'));

  const activatePage = (pageId: string) => {
    useUiStore.getState().selectBox(null);
    if (useUiStore.getState().searchOpen) {
      useUiStore.getState().closeSearch();
    }
    setActivePage(pageId);
  };

  /** Insert source before or after target (y midpoint decides). */
  const movePageRelativeToTarget = (sourceId: string, targetId: string, insertAfter: boolean) => {
    if (sourceId === targetId) return;
    const ids = workspacePages.map((page) => page.id);
    const from = ids.indexOf(sourceId);
    let to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    // After removing source, target index may shift.
    to = next.indexOf(targetId);
    if (to < 0) return;
    const insertAt = insertAfter ? to + 1 : to;
    next.splice(insertAt, 0, sourceId);
    reorderPages(next);
  };

  const clearReorderDrag = () => {
    setDraggingPageId(null);
    setReorderHover(null);
  };

  const openPageMenu = (event: ReactMouseEvent<HTMLElement>, page?: WorkspacePage) => {
    event.preventDefault();
    event.stopPropagation();
    contextMenu.openMenu(event.clientX, event.clientY, [
      ...(multiPage
        ? [
            {
              id: 'new-page',
              label: t('menu.newPage'),
              icon: <ThemeIcon name="add" size={16} />,
              onSelect: openNewPage,
            },
          ]
        : []),
      ...(page
        ? [
            {
              id: 'rename-page',
              label: t('menu.rename'),
              icon: <ThemeIcon name="edit" size={16} />,
              onSelect: () => setRenamePageId(page.id),
            },
            ...(multiPage
              ? [
                  {
                    id: 'set-default-page',
                    label: t(page.id === defaultPageId ? 'page.default' : 'page.setDefault'),
                    icon: <ThemeIcon name="home" size={16} />,
                    disabled: page.id === defaultPageId,
                    onSelect: () => setDefaultPage(page.id),
                  },
                  {
                    id: 'delete-page',
                    label: t('page.delete', { title: page.title }),
                    icon: <ThemeIcon name="trash" size={16} />,
                    danger: true,
                    disabled: workspacePages.length <= 1,
                    onSelect: () => setDeletePageId(page.id),
                  },
                ]
              : []),
          ]
        : []),
    ]);
  };

  return (
    <div className="cardo-v2-sidebar-scroll">
      {globalSearchEnabled || multiPage ? (
        <div className="cardo-v2-nav-block">
          {globalSearchEnabled ? (
            <NavItem
              className={sidebarNavItemClassName({ active: searchOpen })}
              icon={<ThemeIcon name="search" size={16} />}
              active={searchOpen}
              onClick={() => {
                if (searchOpen) closeSearch();
                else openSearch();
              }}
              aria-label={t('toolbar.search')}
              aria-pressed={searchOpen}
            >
              {t('toolbar.search')}
            </NavItem>
          ) : null}
          {multiPage ? (
            <NavItem
              className={sidebarNavItemClassName({})}
              icon={<ThemeIcon name="add" size={16} />}
              onClick={() => {
                if (searchOpen) closeSearch();
                openNewPage();
              }}
              aria-label={t('shell.newPage')}
            >
              {t('shell.newPage')}
            </NavItem>
          ) : null}
        </div>
      ) : null}

      {showCollection && collectionPage ? (
        <div className="cardo-v2-nav-block">
          <NavRow
            pageId={collectionPage.id}
            active={!searchOpen && collectionPage.id === activePageId}
            dropPageId={dropPageId}
            icon={<ThemeIcon name="star" size={16} />}
            label={t('shell.favorites')}
            onActivate={() => activatePage(collectionPage.id)}
            onContextMenu={(event) => openPageMenu(event)}
          />
        </div>
      ) : null}

      <div className="cardo-v2-nav-block">
        <SectionLabel>{t('shell.pages')}</SectionLabel>
        <nav className="cardo-v2-pages" aria-label={t('page.workspacePages')}>
          {visibleUserPages.map((page) =>
            deletePageId === page.id && pageToDelete ? (
              <div
                key={page.id}
                className="cardo-v2-page-drop-row cardo-v2-page-delete-row"
                data-page-drop-id={page.id}
              >
                <PageDeleteConfirmRow
                  title={pageToDelete.title}
                  boxCount={deleteBoxCount}
                  onCancel={() => setDeletePageId(null)}
                  onConfirm={() => {
                    deletePage(pageToDelete.id);
                    setDeletePageId(null);
                  }}
                />
              </div>
            ) : (
              <PageNavRow
                key={page.id}
                page={page}
                active={!searchOpen && page.id === activePageId}
                isDefault={page.id === defaultPageId}
                dropPageId={dropPageId}
                renameRequested={renamePageId === page.id}
                reorderEnabled={multiPage && visibleUserPages.length > 1 && !deletePageId}
                dragging={draggingPageId === page.id}
                reorderHover={
                  reorderHover?.pageId === page.id
                    ? reorderHover.insertAfter
                      ? 'after'
                      : 'before'
                    : null
                }
                onActivate={() => activatePage(page.id)}
                onRename={(title) => renamePage(page.id, title)}
                onRenameRequestHandled={() => setRenamePageId(null)}
                onContextMenu={(event) => openPageMenu(event, page)}
                onReorderDragStart={() => setDraggingPageId(page.id)}
                onReorderDragEnd={clearReorderDrag}
                onReorderHover={(insertAfter) => setReorderHover({ pageId: page.id, insertAfter })}
                onReorderHoverLeave={() =>
                  setReorderHover((current) => (current?.pageId === page.id ? null : current))
                }
                onReorderDrop={(sourceId, insertAfter) =>
                  movePageRelativeToTarget(sourceId, page.id, insertAfter)
                }
              />
            ),
          )}
        </nav>
      </div>

      {showRecycleBin && recycleBinPage ? (
        <div className="cardo-v2-nav-block">
          <NavRow
            pageId={recycleBinPage.id}
            active={!searchOpen && recycleBinPage.id === activePageId}
            dropPageId={dropPageId}
            icon={<ThemeIcon name="trash" size={16} />}
            label={t('shell.recycleBin')}
            onActivate={() => activatePage(recycleBinPage.id)}
            onContextMenu={(event) => openPageMenu(event)}
          />
        </div>
      ) : null}
    </div>
  );
}

function NavRow({
  pageId,
  active,
  dropPageId,
  icon,
  label,
  onActivate,
  onContextMenu,
}: {
  pageId: string;
  active: boolean;
  dropPageId: string | null;
  icon: ReactNode;
  label: string;
  onActivate: () => void;
  onContextMenu: (event: ReactMouseEvent<HTMLElement>) => void;
}) {
  const dropRef = usePageDropElementRef(pageId);
  const isDrop = dropPageId === pageId;
  return (
    <div
      ref={dropRef}
      data-page-drop-id={pageId}
      className={sidebarPageDropRowClassName({ pageId, active, dropPageId })}
    >
      <NavItem
        className={sidebarNavItemClassName({ active })}
        active={active}
        dropTarget={isDrop}
        icon={icon}
        aria-current={active ? 'page' : undefined}
        aria-label={label}
        onClick={onActivate}
        onContextMenu={onContextMenu}
      >
        {label}
      </NavItem>
    </div>
  );
}

function PageNavRow({
  page,
  active,
  isDefault,
  dropPageId,
  renameRequested,
  reorderEnabled,
  dragging,
  reorderHover,
  onActivate,
  onRename,
  onRenameRequestHandled,
  onContextMenu,
  onReorderDragStart,
  onReorderDragEnd,
  onReorderHover,
  onReorderHoverLeave,
  onReorderDrop,
}: {
  page: WorkspacePage;
  active: boolean;
  isDefault: boolean;
  dropPageId: string | null;
  renameRequested: boolean;
  reorderEnabled: boolean;
  dragging: boolean;
  reorderHover: 'before' | 'after' | null;
  onActivate: () => void;
  onRename: (title: string) => void;
  onRenameRequestHandled: () => void;
  onContextMenu: (event: ReactMouseEvent<HTMLElement>) => void;
  onReorderDragStart: () => void;
  onReorderDragEnd: () => void;
  onReorderHover: (insertAfter: boolean) => void;
  onReorderHoverLeave: () => void;
  onReorderDrop: (sourcePageId: string, insertAfter: boolean) => void;
}) {
  const { t } = useI18n();
  const dropRef = usePageDropElementRef(page.id);
  const rename = useInlineRename({
    value: page.title,
    onCommit: onRename,
    // Only ignore pointer events on the active rename row; other nav rows commit.
    ignoreOutsidePointer: isSidebarRenameRowTarget,
  });
  const startRenaming = rename.start;

  useEffect(() => {
    if (!renameRequested) return;
    startRenaming();
    onRenameRequestHandled();
  }, [onRenameRequestHandled, renameRequested, startRenaming]);

  const shellClassName = [
    sidebarPageDropRowClassName({
      pageId: page.id,
      active,
      dropPageId,
      chromeOnShell: rename.renaming,
    }),
    dragging ? 'cardo-v2-page-drop-row-dragging' : '',
    reorderHover ? 'cardo-v2-page-drop-row-reorder-over' : '',
    reorderHover === 'before' ? 'cardo-v2-page-drop-row-reorder-before' : '',
    reorderHover === 'after' ? 'cardo-v2-page-drop-row-reorder-after' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const onDragStart = (event: ReactDragEvent<HTMLElement>) => {
    if (!reorderEnabled || rename.renaming) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData(PAGE_REORDER_MIME, page.id);
    // Do not also write text/plain — avoids false reorder hits from external text drops.
    event.dataTransfer.effectAllowed = 'move';
    onReorderDragStart();
  };

  const onDragOver = (event: ReactDragEvent<HTMLElement>) => {
    if (!reorderEnabled) return;
    const types = event.dataTransfer.types;
    if (!types.includes(PAGE_REORDER_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const rect = event.currentTarget.getBoundingClientRect();
    const insertAfter = event.clientY > rect.top + rect.height / 2;
    onReorderHover(insertAfter);
  };

  const onDragLeave = (event: ReactDragEvent<HTMLElement>) => {
    if (!reorderEnabled) return;
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) return;
    onReorderHoverLeave();
  };

  const onDrop = (event: ReactDragEvent<HTMLElement>) => {
    if (!reorderEnabled) return;
    const sourceId = event.dataTransfer.getData(PAGE_REORDER_MIME);
    if (!sourceId) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const insertAfter = event.clientY > rect.top + rect.height / 2;
    onReorderDrop(sourceId, insertAfter);
    onReorderDragEnd();
  };

  if (rename.renaming) {
    return (
      <div
        ref={dropRef}
        data-page-drop-id={page.id}
        data-sidebar-rename-row=""
        className={shellClassName}
        onContextMenu={rename.onContextMenu}
      >
        <span className="cardo-v2-nav-item-icon cardo-nav-item-icon" aria-hidden="true">
          <ThemeIcon name="document" size={16} />
        </span>
        <Input
          ref={rename.inputRef}
          className="cardo-v2-nav-item-input"
          aria-label={t('page.rename', { title: page.title })}
          value={rename.draft}
          onChange={(event) => rename.setDraft(event.target.value)}
          onBlur={rename.commit}
          onKeyDown={rename.onKeyDown}
          onContextMenu={rename.onContextMenu}
        />
      </div>
    );
  }

  return (
    <div
      ref={dropRef}
      data-page-drop-id={page.id}
      className={shellClassName}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <NavItem
        className={sidebarNavItemClassName({ active })}
        active={active}
        dropTarget={dropPageId === page.id}
        icon={<ThemeIcon name="document" size={16} />}
        trailing={isDefault ? <ThemeIcon name="home" size={13} title={t('page.default')} /> : null}
        aria-current={active ? 'page' : undefined}
        aria-label={isDefault ? `${page.title} (${t('page.default')})` : page.title}
        draggable={reorderEnabled}
        onDragStart={onDragStart}
        onDragEnd={onReorderDragEnd}
        onClick={onActivate}
        onDoubleClick={(event) => {
          event.stopPropagation();
          rename.start();
        }}
        onContextMenu={onContextMenu}
      >
        {page.title}
      </NavItem>
      <IconButton
        className="cardo-v2-page-row-menu"
        type="button"
        aria-label={t('page.moreOptions')}
        tooltip={t('page.moreOptions')}
        tooltipSide="right"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onContextMenu(event);
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <ThemeIcon name="options" size={14} />
      </IconButton>
    </div>
  );
}

function isSidebarRenameRowTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('[data-sidebar-rename-row]'));
}
