import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { FloatingMenuItem } from './menuTypes';
import { SubmenuChevron, useFloatingMenu } from './useFloatingMenu';
import { IconFrame } from '../../ui/khaos/icon-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../../ui/primitives/dropdown-menu';

export function FloatingMenuLayer() {
  const { menu, closeMenu } = useFloatingMenu();

  useEffect(() => {
    if (!menu) return;
    const onWheel = () => closeMenu();
    window.addEventListener('wheel', onWheel, true);
    return () => window.removeEventListener('wheel', onWheel, true);
  }, [closeMenu, menu]);

  const triggerStyle = useMemo<CSSProperties>(
    () => ({
      position: 'fixed',
      left: menu?.x ?? 0,
      top: menu?.y ?? 0,
      width: 1,
      height: 1,
      pointerEvents: 'none',
    }),
    [menu?.x, menu?.y],
  );

  return (
    <DropdownMenu open={Boolean(menu)} onOpenChange={(open) => !open && closeMenu()} modal={false}>
      <DropdownMenuTrigger asChild>
        <span aria-hidden style={triggerStyle} />
      </DropdownMenuTrigger>
      {menu ? (
        <DropdownMenuContent align="start" side="bottom" onCloseAutoFocus={(event) => event.preventDefault()}>
          <MenuItems items={menu.items} closeMenu={closeMenu} />
        </DropdownMenuContent>
      ) : null}
    </DropdownMenu>
  );
}

function MenuItems({ items, closeMenu }: { items: FloatingMenuItem[]; closeMenu: () => void }) {
  return items.map((item) => (
    <MenuItem key={item.id} item={item} closeMenu={closeMenu} />
  ));
}

function MenuItem({ item, closeMenu }: { item: FloatingMenuItem; closeMenu: () => void }) {
  const content = (
    <>
      <IconFrame className="wbn-menu-icon">{item.icon}</IconFrame>
      <span>{item.label}</span>
      <IconFrame className="wbn-menu-trailing">
        {item.children ? <SubmenuChevron /> : item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
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
