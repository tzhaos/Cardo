import { create } from 'zustand';

export type IndependentMenuId = 'settings';

export interface IndependentMenuPosition {
  x: number;
  y: number;
}

export interface IndependentMenuSize {
  width: number;
  height: number;
}

interface IndependentMenuEntry {
  open: boolean;
  position: IndependentMenuPosition;
  size: IndependentMenuSize;
}

interface IndependentMenuStore {
  menus: Record<IndependentMenuId, IndependentMenuEntry>;
  closeMenu: (menuId: IndependentMenuId) => void;
  moveMenu: (menuId: IndependentMenuId, position: IndependentMenuPosition) => void;
  resizeMenu: (menuId: IndependentMenuId, size: IndependentMenuSize) => void;
  toggleMenu: (menuId: IndependentMenuId) => void;
}

export const SETTINGS_DEFAULT_SIZE = { width: 860, height: 620 };
export const SETTINGS_MIN_SIZE = { width: 560, height: 400 };

export const useIndependentMenuStore = create<IndependentMenuStore>()((set) => ({
  menus: createDefaultMenus(),
  closeMenu: (menuId) =>
    set((state) => ({
      menus: {
        ...state.menus,
        [menuId]: { ...state.menus[menuId], open: false },
      },
    })),
  moveMenu: (menuId, position) =>
    set((state) => ({
      menus: {
        ...state.menus,
        [menuId]: { ...state.menus[menuId], position },
      },
    })),
  resizeMenu: (menuId, size) =>
    set((state) => ({
      menus: {
        ...state.menus,
        [menuId]: { ...state.menus[menuId], size },
      },
    })),
  toggleMenu: (menuId) =>
    set((state) => ({
      menus: {
        ...state.menus,
        [menuId]: { ...state.menus[menuId], open: !state.menus[menuId].open },
      },
    })),
}));

function createDefaultMenus(): IndependentMenuStore['menus'] {
  return {
    settings: {
      open: false,
      position: getInitialMenuPosition(SETTINGS_DEFAULT_SIZE),
      size: { ...SETTINGS_DEFAULT_SIZE },
    },
  };
}

export function clampIndependentMenuPosition(
  position: IndependentMenuPosition,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  margin = 12,
) {
  const maximumX = Math.max(margin, viewport.width - size.width - margin);
  const maximumY = Math.max(margin, viewport.height - size.height - margin);

  // Integer CSS pixels — fractional left/top rasterizes the whole shell soft.
  return {
    x: Math.round(Math.min(Math.max(position.x, margin), maximumX)),
    y: Math.round(Math.min(Math.max(position.y, margin), maximumY)),
  };
}

export function clampIndependentMenuSize(
  size: IndependentMenuSize,
  position: IndependentMenuPosition,
  viewport: { width: number; height: number },
  minSize: IndependentMenuSize = SETTINGS_MIN_SIZE,
  margin = 12,
): IndependentMenuSize {
  const maxWidth = Math.max(minSize.width, viewport.width - position.x - margin);
  const maxHeight = Math.max(minSize.height, viewport.height - position.y - margin);
  return {
    width: Math.min(Math.max(Math.round(size.width), minSize.width), maxWidth),
    height: Math.min(Math.max(Math.round(size.height), minSize.height), maxHeight),
  };
}

function getInitialMenuPosition(size: { width: number; height: number }) {
  if (typeof window === 'undefined') return { x: 160, y: 120 };
  const actualSize = {
    width: Math.min(size.width, window.innerWidth - 24),
    height: Math.min(size.height, window.innerHeight - 24),
  };
  return clampIndependentMenuPosition(
    {
      x: Math.round((window.innerWidth - actualSize.width) / 2),
      y: Math.round((window.innerHeight - actualSize.height) / 2),
    },
    actualSize,
    { width: window.innerWidth, height: window.innerHeight },
  );
}
