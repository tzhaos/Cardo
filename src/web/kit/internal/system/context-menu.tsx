import { useCallback, useEffect, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { ThemeIcon } from '../icons/ThemeIcon';
import { IconFrame } from '../../components/IconButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../primitives/dropdown-menu';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separatorBefore?: boolean;
  children?: ContextMenuItem[];
  onSelect?: () => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

interface ContextMenuStore {
  menu: ContextMenuState | null;
  openMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
  closeMenu: () => void;
}

/**
 * Viewport-space context menu state. The host must render outside transformed
 * surfaces (canvas pan, box drag, page scenes) so fixed coordinates stay correct.
 */
export const useContextMenuStore = create<ContextMenuStore>((set) => ({
  menu: null,
  openMenu: (x, y, items) => {
    if (typeof window === 'undefined') {
      set({ menu: { x, y, items } });
      return;
    }
    // Keep the 1x1 anchor fully on-screen so Radix collision logic stays stable.
    const xClamped = Math.min(Math.max(x, 1), Math.max(1, window.innerWidth - 1));
    const yClamped = Math.min(Math.max(y, 1), Math.max(1, window.innerHeight - 1));
    set({ menu: { x: xClamped, y: yClamped, items } });
  },
  closeMenu: () => set({ menu: null }),
}));

export function useContextMenu() {
  const openMenu = useContextMenuStore((state) => state.openMenu);
  const closeMenu = useContextMenuStore((state) => state.closeMenu);
  return { openMenu, closeMenu };
}

/** Single app-root host. Call once from CardoApp, never under canvas transforms. */
export function ContextMenuHost() {
  const menu = useContextMenuStore((state) => state.menu);
  const closeMenu = useContextMenuStore((state) => state.closeMenu);

  useEffect(() => {
    if (!menu) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    // Capture phase: canvas pan (and similar) stopPropagation on bubble, so Radix
    // non-modal outside dismiss never sees pointerdown. Close before that happens.
    const onPointerDownCapture = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element)) {
        closeMenu();
        return;
      }
      if (
        target.closest(
          '[data-slot="dropdown-menu-content"], [data-slot="dropdown-menu-sub-content"]',
        )
      ) {
        return;
      }
      closeMenu();
    };
    window.addEventListener('wheel', closeMenu, true);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('pointerdown', onPointerDownCapture, true);
    return () => {
      window.removeEventListener('wheel', closeMenu, true);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('pointerdown', onPointerDownCapture, true);
    };
  }, [closeMenu, menu]);

  if (typeof document === 'undefined') return null;

  return createPortal(<ContextMenuSurface state={menu} onClose={closeMenu} />, document.body);
}

function ContextMenuSurface({
  state,
  onClose,
}: {
  state: ContextMenuState | null;
  onClose: () => void;
}) {
  const triggerStyle = useMemo<CSSProperties>(
    () => ({
      position: 'fixed',
      left: state?.x ?? 0,
      top: state?.y ?? 0,
      width: 1,
      height: 1,
      margin: 0,
      padding: 0,
      border: 0,
      opacity: 0,
      pointerEvents: 'none',
      zIndex: 200,
    }),
    [state?.x, state?.y],
  );

  return (
    <DropdownMenu open={Boolean(state)} onOpenChange={(open) => !open && onClose()} modal={false}>
      <DropdownMenuTrigger asChild>
        <span aria-hidden style={triggerStyle} />
      </DropdownMenuTrigger>
      {state ? (
        <DropdownMenuContent
          align="start"
          side="bottom"
          sideOffset={0}
          collisionPadding={8}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <MenuItems items={state.items} closeMenu={onClose} />
        </DropdownMenuContent>
      ) : null}
    </DropdownMenu>
  );
}

function MenuItems({ items, closeMenu }: { items: ContextMenuItem[]; closeMenu: () => void }) {
  return items.map((item) => <MenuItem key={item.id} item={item} closeMenu={closeMenu} />);
}

function MenuItem({ item, closeMenu }: { item: ContextMenuItem; closeMenu: () => void }) {
  const content = (
    <>
      <IconFrame className="cardo-menu-icon">{item.icon}</IconFrame>
      <span>{item.label}</span>
      <IconFrame className="cardo-menu-trailing">
        {item.children ? (
          <ThemeIcon name="chevronRight" size={14} />
        ) : item.shortcut ? (
          <kbd>{item.shortcut}</kbd>
        ) : null}
      </IconFrame>
    </>
  );

  return (
    <>
      {item.separatorBefore ? <DropdownMenuSeparator /> : null}
      {item.children ? (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            disabled={item.disabled}
            className={item.danger ? 'cardo-menu-row-danger' : undefined}
          >
            {content}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <MenuItems items={item.children} closeMenu={closeMenu} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      ) : (
        <DropdownMenuItem
          disabled={item.disabled}
          className={item.danger ? 'cardo-menu-row-danger' : undefined}
          onSelect={() => {
            item.onSelect?.();
            closeMenu();
          }}
        >
          {content}
        </DropdownMenuItem>
      )}
    </>
  );
}

export function useCloseContextMenuOnInteraction() {
  const closeMenu = useContextMenuStore((state) => state.closeMenu);
  return useCallback(() => closeMenu(), [closeMenu]);
}
