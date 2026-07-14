import { useEffect, useMemo, useState } from 'react';
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { useUiStore } from '../app/stores/uiStore';
import { useWorkspaceStore } from '../app/stores/workspaceStore';
import { useInlineRename } from '../app/useInlineRename';
import { Input } from '../kit/input';
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
import { TabDeleteConfirmView } from '../features/pages/TabDeleteConfirmView';
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
    return workspacePages.filter((page) => page.id === activePageId);
  }, [activePageId, multiPage, workspacePages]);

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
      if (!target?.closest('[data-v2-sidebar-nav]')) {
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

  const movePageBeforeTarget = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const ids = workspacePages.map((page) => page.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, sourceId);
    reorderPages(next);
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
      {pageToDelete ? (
        <div className="cardo-v2-delete-confirm">
          <TabDeleteConfirmView
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
        <>
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
              {visibleUserPages.map((page) => (
                <PageNavRow
                  key={page.id}
                  page={page}
                  active={!searchOpen && page.id === activePageId}
                  dropPageId={dropPageId}
                  renameRequested={renamePageId === page.id}
                  reorderEnabled={multiPage && visibleUserPages.length > 1}
                  dragging={draggingPageId === page.id}
                  onActivate={() => activatePage(page.id)}
                  onRename={(title) => renamePage(page.id, title)}
                  onRenameRequestHandled={() => setRenamePageId(null)}
                  onContextMenu={(event) => openPageMenu(event, page)}
                  onReorderDragStart={() => setDraggingPageId(page.id)}
                  onReorderDragEnd={() => setDraggingPageId(null)}
                  onReorderDrop={(sourceId) => movePageBeforeTarget(sourceId, page.id)}
                />
              ))}
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
        </>
      )}
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
  dropPageId,
  renameRequested,
  reorderEnabled,
  dragging,
  onActivate,
  onRename,
  onRenameRequestHandled,
  onContextMenu,
  onReorderDragStart,
  onReorderDragEnd,
  onReorderDrop,
}: {
  page: WorkspacePage;
  active: boolean;
  dropPageId: string | null;
  renameRequested: boolean;
  reorderEnabled: boolean;
  dragging: boolean;
  onActivate: () => void;
  onRename: (title: string) => void;
  onRenameRequestHandled: () => void;
  onContextMenu: (event: ReactMouseEvent<HTMLElement>) => void;
  onReorderDragStart: () => void;
  onReorderDragEnd: () => void;
  onReorderDrop: (sourcePageId: string) => void;
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
  ]
    .filter(Boolean)
    .join(' ');

  const onDragStart = (event: ReactDragEvent<HTMLElement>) => {
    if (!reorderEnabled || rename.renaming) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData(PAGE_REORDER_MIME, page.id);
    event.dataTransfer.setData('text/plain', page.id);
    event.dataTransfer.effectAllowed = 'move';
    onReorderDragStart();
  };

  const onDragOver = (event: ReactDragEvent<HTMLElement>) => {
    if (!reorderEnabled) return;
    const types = event.dataTransfer.types;
    if (!types.includes(PAGE_REORDER_MIME) && !types.includes('text/plain')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (event: ReactDragEvent<HTMLElement>) => {
    if (!reorderEnabled) return;
    const sourceId =
      event.dataTransfer.getData(PAGE_REORDER_MIME) || event.dataTransfer.getData('text/plain');
    if (!sourceId) return;
    event.preventDefault();
    event.stopPropagation();
    onReorderDrop(sourceId);
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
      onDrop={onDrop}
    >
      <NavItem
        className={sidebarNavItemClassName({ active })}
        active={active}
        dropTarget={dropPageId === page.id}
        icon={<ThemeIcon name="document" size={16} />}
        aria-current={active ? 'page' : undefined}
        aria-label={page.title}
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
    </div>
  );
}

function isSidebarRenameRowTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('[data-sidebar-rename-row]'));
}
