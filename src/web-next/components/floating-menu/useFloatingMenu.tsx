import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ChevronRight, PanelTop, Plus } from 'lucide-react';
import type { WorkspaceBoxPreset } from '../../domain/workspace';
import type { FloatingMenuItem, FloatingMenuState } from './menuTypes';
import { useI18n } from '../../i18n/useI18n';

interface FloatingMenuContextValue {
  menu: FloatingMenuState | null;
  openMenu: (menu: FloatingMenuState) => void;
  closeMenu: () => void;
  openCanvasMenu: (
    x: number,
    y: number,
    actions: {
      createPage?: () => void;
      createBox?: (preset: WorkspaceBoxPreset) => void;
      canvasTools?: FloatingMenuItem[];
    },
  ) => void;
}

const FloatingMenuContext = createContext<FloatingMenuContextValue | null>(null);

export function FloatingMenuProvider({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState<FloatingMenuState | null>(null);
  const { t } = useI18n();
  const closeMenu = useCallback(() => setMenu(null), []);
  const openMenu = useCallback((nextMenu: FloatingMenuState) => setMenu(nextMenu), []);
  const openCanvasMenu = useCallback(
    (
      x: number,
      y: number,
      actions: {
        createPage?: () => void;
        createBox?: (preset: WorkspaceBoxPreset) => void;
        canvasTools?: FloatingMenuItem[];
      },
    ) => {
      setMenu({
        id: 'canvas',
        x,
        y,
        items: [
          ...(actions.createPage
            ? [
                {
                  id: 'new-page',
                  label: t('menu.newPage'),
                  icon: <PanelTop size={16} />,
                  onSelect: actions.createPage,
                },
              ]
            : []),
          ...(actions.createBox
            ? [
                {
                  id: 'new-box',
                  label: t('menu.newBox'),
                  icon: <Plus size={16} />,
                  onSelect: () => actions.createBox('general'),
                },
              ]
            : []),
          ...(actions.canvasTools ?? []).map((item, index) => ({
            ...item,
            separatorBefore:
              index === 0 && Boolean(actions.createPage || actions.createBox)
                ? true
                : item.separatorBefore,
          })),
        ],
      });
    },
    [t],
  );

  const value = useMemo(
    () => ({ menu, openMenu, closeMenu, openCanvasMenu }),
    [closeMenu, menu, openCanvasMenu, openMenu],
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
