/**
 * Bridge sidebar page rows into the existing box→page drop stack (KD-18).
 *
 * Shared public APIs keep historical names; semantics are primary nav / sidebar:
 * - registerTopBarElement / getTopBarElement — primary nav hit region (sidebar product-nav root)
 * - registerPageDropElement(pageId, el) — each droppable nav row
 * - uiStore.boxDragOverTopBar / boxDropPageId — over primary nav + target page
 * - BoxPageDropController — collection / user-page / recycle rules SoT
 *
 * Mount (CardoApp workspace mode):
 *   <BoxPageDropController />
 *   product-nav root: sidebarNavRootRef → registerTopBarElement (not settings foot)
 *   <SidebarNav /> rows → registerPageDropElement(pageId)
 *
 * Do not rename shared store/registry/CSS symbols until a coordinated cutover (KD-18).
 * Settings foot must not call registerPageDropElement (not a page target).
 */

import { useCallback } from 'react';
import type { RefCallback } from 'react';
import { registerPageDropElement, registerTopBarElement } from '../app/interactionElementRegistry';
import { useUiStore } from '../app/stores/uiStore';

/** Register the sidebar product-nav root as the controller primary-nav hit region (registerTopBarElement name kept). */
export function registerSidebarNavRoot(element: HTMLElement | null) {
  registerTopBarElement(element);
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

/**
 * Drop UI state from the shared uiStore.
 * `overNav` is the semantic meaning of boxDragOverTopBar during the dual-folder period.
 */
export function useSidebarBoxDropUi() {
  const boxDragActive = useUiStore((state) => Boolean(state.draggedBoxId));
  const overNav = useUiStore((state) => state.boxDragOverTopBar);
  const dropPageId = useUiStore((state) => state.boxDropPageId);
  return { boxDragActive, overNav, dropPageId };
}

/**
 * Class list for a droppable nav row shell.
 * Outer is hit-target only (no hover/active chrome) — kit NavItem owns pill styles.
 * Pass `chromeOnShell` for rename rows that have no NavItem child.
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
    'cardo-v2-page-drop-row',
    chromeOnShell && active ? 'cardo-v2-nav-item cardo-v2-nav-item-active' : '',
    chromeOnShell && dropPageId === pageId ? 'cardo-v2-nav-drop-target' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Classes for kit NavItem used as a product sidebar row (codex recipes hit these). */
export function sidebarNavItemClassName(options: { active?: boolean; className?: string }) {
  const { active, className } = options;
  return ['cardo-v2-nav-item', active ? 'cardo-v2-nav-item-active' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
}

/**
 * Class list for the sidebar column (aside) while a box is being dragged.
 * Default base is cardo-v2-sidebar so AppShell layout width/flex stay intact.
 * Pass className to override the base (e.g. product-nav scroll root only).
 */
export function sidebarNavRootClassName(options: {
  boxDragActive: boolean;
  overNav: boolean;
  className?: string;
}) {
  const { boxDragActive, overNav, className } = options;
  return [
    className ?? 'cardo-v2-sidebar',
    boxDragActive ? 'cardo-v2-sidebar-drop-mode' : '',
    // Historical class kept so any shared CSS hooks still match; v2 styles use cardo-v2-*.
    overNav ? 'cardo-v2-sidebar-drag-over cardo-top-bar-drag-over' : '',
  ]
    .filter(Boolean)
    .join(' ');
}
