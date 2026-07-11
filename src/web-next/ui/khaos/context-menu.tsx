import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { IconFrame } from './icon-button';
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

export function useContextMenu() {
  const [state, setState] = useState<ContextMenuState | null>(null);
  const closeMenu = useCallback(() => setState(null), []);
  const openMenu = useCallback((x: number, y: number, items: ContextMenuItem[]) => {
    setState({ x, y, items });
  }, []);

  return {
    openMenu,
    closeMenu,
    menu: <ContextMenuSurface state={state} onClose={closeMenu} />,
  };
}

function ContextMenuSurface({
  state,
  onClose,
}: {
  state: ContextMenuState | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!state) return;
    window.addEventListener('wheel', onClose, true);
    return () => window.removeEventListener('wheel', onClose, true);
  }, [onClose, state]);

  const triggerStyle = useMemo<CSSProperties>(
    () => ({
      position: 'fixed',
      left: state?.x ?? 0,
      top: state?.y ?? 0,
      width: 1,
      height: 1,
      pointerEvents: 'none',
    }),
    [state?.x, state?.y],
  );

  return (
    <DropdownMenu open={Boolean(state)} onOpenChange={(open) => !open && onClose()} modal={false}>
      <DropdownMenuTrigger asChild>
        <span aria-hidden style={triggerStyle} />
      </DropdownMenuTrigger>
      {state ? (
        <DropdownMenuContent align="start" side="bottom" onCloseAutoFocus={(event) => event.preventDefault()}>
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
      <IconFrame className="wbn-menu-icon">{item.icon}</IconFrame>
      <span>{item.label}</span>
      <IconFrame className="wbn-menu-trailing">
        {item.children ? <ChevronRight size={14} /> : item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
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
            className={item.danger ? 'wbn-menu-row-danger' : undefined}
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
          className={item.danger ? 'wbn-menu-row-danger' : undefined}
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
