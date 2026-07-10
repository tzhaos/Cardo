import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  Bookmark,
  ChevronRight,
  Clipboard,
  Folder,
  PackageOpen,
  PanelTop,
  Plus,
  RotateCcw,
} from 'lucide-react';
import type { WorkspaceBoxPreset } from '../../domain/workspace';
import type { FloatingMenuItem, FloatingMenuState } from './menuTypes';
import { useI18n } from '../../i18n/useI18n';

interface FloatingMenuContextValue {
  menu: FloatingMenuState | null;
  openMenu: (menu: FloatingMenuState) => void;
  closeMenu: () => void;
  openCreateBoxMenu: (
    x: number,
    y: number,
    createBox: (preset: WorkspaceBoxPreset) => void,
  ) => void;
  openCanvasMenu: (
    x: number,
    y: number,
    actions: {
      createPage: () => void;
      createBox: (preset: WorkspaceBoxPreset) => void;
      resetView?: () => void;
    },
  ) => void;
}

const FloatingMenuContext = createContext<FloatingMenuContextValue | null>(null);

export function FloatingMenuProvider({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState<FloatingMenuState | null>(null);
  const { t } = useI18n();
  const boxRows = useMemo(
    () => [
      { id: 'general' as const, label: t('box.general'), icon: <PackageOpen size={16} /> },
      { id: 'folder' as const, label: t('box.folder'), icon: <Folder size={16} /> },
      { id: 'bookmark' as const, label: t('box.bookmark'), icon: <Bookmark size={16} /> },
      { id: 'clipboard' as const, label: t('box.clipboard'), icon: <Clipboard size={16} /> },
    ],
    [t],
  );
  const createBoxItems = useCallback(
    (createBox: (preset: WorkspaceBoxPreset) => void): FloatingMenuItem[] =>
      boxRows.map((row) => ({
        id: row.id,
        label: row.label,
        icon: row.icon,
        onSelect: () => createBox(row.id),
      })),
    [boxRows],
  );
  const closeMenu = useCallback(() => setMenu(null), []);
  const openMenu = useCallback((nextMenu: FloatingMenuState) => setMenu(nextMenu), []);
  const openCreateBoxMenu = useCallback(
    (x: number, y: number, createBox: (preset: WorkspaceBoxPreset) => void) => {
      setMenu({ id: 'create-box', x, y, items: createBoxItems(createBox) });
    },
    [createBoxItems],
  );
  const openCanvasMenu = useCallback(
    (
      x: number,
      y: number,
      actions: {
        createPage: () => void;
        createBox: (preset: WorkspaceBoxPreset) => void;
        resetView?: () => void;
      },
    ) => {
      setMenu({
        id: 'canvas',
        x,
        y,
        items: [
          {
            id: 'new-page',
            label: t('menu.newPage'),
            icon: <PanelTop size={16} />,
            onSelect: actions.createPage,
          },
          {
            id: 'new-box',
            label: t('menu.newBox'),
            icon: <Plus size={16} />,
            children: createBoxItems(actions.createBox),
          },
          {
            id: 'reset-view',
            label: t('menu.resetView'),
            icon: <RotateCcw size={16} />,
            disabled: !actions.resetView,
            onSelect: actions.resetView,
          },
        ],
      });
    },
    [createBoxItems, t],
  );

  const value = useMemo(
    () => ({ menu, openMenu, closeMenu, openCreateBoxMenu, openCanvasMenu }),
    [closeMenu, menu, openCanvasMenu, openCreateBoxMenu, openMenu],
  );

  return <FloatingMenuContext.Provider value={value}>{children}</FloatingMenuContext.Provider>;
}

export function useFloatingMenu() {
  const context = useContext(FloatingMenuContext);

  if (!context) {
    throw new Error('useFloatingMenu must be used inside FloatingMenuProvider');
  }

  return context;
}

export function SubmenuChevron() {
  return <ChevronRight size={14} />;
}
