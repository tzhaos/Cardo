/**
 * Bridge sidebar page rows into the existing box→page drop stack (KD-18).
 *
 * Shared public APIs (primary nav / sidebar semantics):
 * - registerPrimaryNavElement / getPrimaryNavElement — primary nav hit region (sidebar product-nav root)
 * - registerPageDropElement(pageId, el) — each droppable nav row
 * - uiStore.boxDragOverPrimaryNav / boxDropPageId — over primary nav + target page
 * - BoxPageDropController — collection / user-page / recycle rules SoT
 *
 * Mount (CardoApp workspace mode):
 *   <BoxPageDropController />
 *   product-nav root: sidebarNavRootRef → registerPrimaryNavElement (not settings foot)
 *   <SidebarNav /> rows → registerPageDropElement(pageId)
 *
 * Settings foot must not call registerPageDropElement (not a page target).
 */

import { useCallback } from 'react';
import type { RefCallback } from 'react';
import {
  registerPageDropElement,
  registerPrimaryNavElement,
} from '../app/interactionElementRegistry';
import { useUiStore } from '../app/stores/uiStore';

/** Register the sidebar product-nav root as the controller primary-nav hit region. */
export function registerSidebarNavRoot(element: HTMLElement | null) {
  registerPrimaryNavElement(element);
}

/** Ref callback form of registerSidebarNavRoot for the product-nav column root. */
export const sidebarNavRootRef: RefCallback<HTMLDivElement> = (element) => {
  registerSidebarNavRoot(element);
};

/** Stable ref callback that registers one page row as a drop target. */
export function usePageDropElementRef(pageId: string): RefCallback<HTMLElement> {
  return useCallback(
    (element: HTMLElement | null) => {
      registerPageDropElement(pageId, element);
    },
    [pageId],
  );
}

/** Drop UI state from the shared uiStore (overNav = boxDragOverPrimaryNav). */
export function useSidebarBoxDropUi() {
  const boxDragActive = useUiStore((state) => Boolean(state.draggedBoxId));
  const overNav = useUiStore((state) => state.boxDragOverPrimaryNav);
  const dropPageId = useUiStore((state) => state.boxDropPageId);
  return { boxDragActive, overNav, dropPageId };
}

/**
 * Class list for a droppable nav row shell.
 * Outer is hit-target only (no hover/active chrome) — kit NavItem owns pill styles.
 * Pass `chromeOnShell` for rename rows that have no NavItem child (kit classes on shell).
 */
export function sidebarPageDropRowClassName(options: {
  pageId: string;
  active: boolean;
  dropPageId: string | null;
  className?: string;
  /** When true, shell owns active/drop chrome (rename mode without NavItem). */
  chromeOnShell?: boolean;
}) {
  const { pageId, active, dropPageId, className, chromeOnShell = false } = options;
  return [
    'cardo-shell-page-drop-row',
    chromeOnShell ? 'cardo-nav-item' : '',
    chromeOnShell && active ? 'cardo-nav-item-active' : '',
    chromeOnShell && dropPageId === pageId ? 'cardo-shell-nav-drop-target' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Extra classes for kit NavItem as a product sidebar row.
 * Kit NavItem already emits cardo-nav-item (+ active); this only forwards extras.
 */
export function sidebarNavItemClassName(options: { active?: boolean; className?: string }) {
  const { className } = options;
  return className ?? '';
}

/**
 * Class list for the sidebar column (aside) while a box is being dragged.
 * Default base is cardo-shell-sidebar so AppShell layout width/flex stay intact.
 * Pass className to override the base (e.g. product-nav scroll root only).
 */
export function sidebarNavRootClassName(options: {
  boxDragActive: boolean;
  overNav: boolean;
  className?: string;
}) {
  const { boxDragActive, overNav, className } = options;
  return [
    className ?? 'cardo-shell-sidebar',
    boxDragActive ? 'cardo-shell-sidebar-drop-mode' : '',
    overNav ? 'cardo-shell-sidebar-drag-over' : '',
  ]
    .filter(Boolean)
    .join(' ');
}
