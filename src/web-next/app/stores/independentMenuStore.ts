import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { webNextStorage } from '../../platform/hostPlatform';

export type IndependentMenuId = 'settings' | 'journal';

export interface IndependentMenuPosition {
  x: number;
  y: number;
}

interface IndependentMenuEntry {
  open: boolean;
  position: IndependentMenuPosition;
}

interface IndependentMenuStore {
  menus: Record<IndependentMenuId, IndependentMenuEntry>;
  closeMenu: (menuId: IndependentMenuId) => void;
  moveMenu: (menuId: IndependentMenuId, position: IndependentMenuPosition) => void;
  toggleMenu: (menuId: IndependentMenuId) => void;
}

const SETTINGS_DEFAULT_SIZE = { width: 640, height: 430 };
const JOURNAL_DEFAULT_SIZE = { width: 420, height: 600 };

export const useIndependentMenuStore = create<IndependentMenuStore>()(
  persist(
    (set) => ({
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
      toggleMenu: (menuId) =>
        set((state) => ({
          menus: {
            ...state.menus,
            [menuId]: { ...state.menus[menuId], open: !state.menus[menuId].open },
          },
        })),
    }),
    {
      name: 'khaosbox.web-next.independent-menus',
      version: 1,
      storage: createJSONStorage(() => webNextStorage),
      skipHydration: true,
      partialize: (state) => ({
        menus: Object.fromEntries(
          Object.entries(state.menus).map(([menuId, menu]) => [
            menuId,
            { open: false, position: menu.position },
          ]),
        ) as IndependentMenuStore['menus'],
      }),
      merge: (persistedState, currentState) => {
        const persistedMenus = (persistedState as Partial<IndependentMenuStore> | undefined)?.menus;
        return {
          ...currentState,
          menus: Object.fromEntries(
            (Object.keys(currentState.menus) as IndependentMenuId[]).map((menuId) => [
              menuId,
              {
                ...currentState.menus[menuId],
                position: persistedMenus?.[menuId]?.position ?? currentState.menus[menuId].position,
              },
            ]),
          ) as IndependentMenuStore['menus'],
        };
      },
    },
  ),
);

function createDefaultMenus(): IndependentMenuStore['menus'] {
  return {
    settings: { open: false, position: getInitialMenuPosition(SETTINGS_DEFAULT_SIZE) },
    journal: { open: false, position: getInitialMenuPosition(JOURNAL_DEFAULT_SIZE) },
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

  return {
    x: Math.min(Math.max(position.x, margin), maximumX),
    y: Math.min(Math.max(position.y, margin), maximumY),
  };
}

function getInitialMenuPosition(size: { width: number; height: number }) {
  if (typeof window === 'undefined') {
    return { x: 160, y: 120 };
  }

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
