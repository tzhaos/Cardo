import { useEffect, useMemo, useState } from 'react';
import type { FloatingMenuItem } from './menuTypes';
import { SubmenuChevron, useFloatingMenu } from './useFloatingMenu';

export function FloatingMenuLayer() {
  const { menu, closeMenu } = useFloatingMenu();
  const [submenuId, setSubmenuId] = useState<string | null>(null);

  useEffect(() => {
    setSubmenuId(null);
  }, [menu?.id]);

  useEffect(() => {
    if (!menu) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-floating-menu]')) {
        closeMenu();
      }
    };
    const onWheel = () => closeMenu();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('wheel', onWheel, true);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('wheel', onWheel, true);
    };
  }, [closeMenu, menu]);

  const position = useMemo(() => {
    if (!menu || typeof window === 'undefined') {
      return { left: 0, top: 0 };
    }

    return {
      left: Math.min(menu.x, window.innerWidth - 440),
      top: Math.min(menu.y, window.innerHeight - 280),
    };
  }, [menu]);

  const submenu = menu?.items.find((item) => item.id === submenuId)?.children;

  if (!menu) {
    return null;
  }

  return (
    <div className="wbn-floating-menu-wrap" data-floating-menu style={position}>
      <MenuPanel
        items={menu.items}
        closeMenu={closeMenu}
        onHoverSubmenu={setSubmenuId}
        submenuId={submenuId}
      />
      {submenu ? (
        <div className="wbn-floating-submenu">
          <MenuPanel
            items={submenu}
            closeMenu={closeMenu}
            onHoverSubmenu={setSubmenuId}
            submenuId={submenuId}
          />
        </div>
      ) : null}
    </div>
  );
}

function MenuPanel({
  items,
  closeMenu,
  onHoverSubmenu,
  submenuId,
}: {
  items: FloatingMenuItem[];
  closeMenu: () => void;
  onHoverSubmenu: (id: string | null) => void;
  submenuId: string | null;
}) {
  return (
    <div className="wbn-floating-menu">
      {items.map((item) => (
        <button
          className={`wbn-menu-row${item.danger ? ' wbn-menu-row-danger' : ''}${submenuId === item.id ? ' wbn-menu-row-open' : ''}`}
          disabled={item.disabled}
          key={item.id}
          onMouseEnter={() => onHoverSubmenu(item.children ? item.id : null)}
          onClick={() => {
            if (item.disabled || item.children) {
              return;
            }
            item.onSelect?.();
            closeMenu();
          }}
          type="button"
        >
          <span className="wbn-menu-icon">{item.icon}</span>
          <span>{item.label}</span>
          <span className="wbn-menu-trailing">
            {item.children ? <SubmenuChevron /> : item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
          </span>
        </button>
      ))}
    </div>
  );
}
