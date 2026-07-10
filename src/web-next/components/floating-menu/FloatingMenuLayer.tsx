import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { FloatingMenuItem } from './menuTypes';
import { SubmenuChevron, useFloatingMenu } from './useFloatingMenu';
import { IconFrame } from '../primitives/IconPrimitives';

export function FloatingMenuLayer() {
  const { menu, closeMenu } = useFloatingMenu();
  const [submenuId, setSubmenuId] = useState<string | null>(null);
  const [submenuAnchor, setSubmenuAnchor] = useState<DOMRect | null>(null);
  const [submenuSize, setSubmenuSize] = useState({ width: 0, height: 0 });
  const [menuSize, setMenuSize] = useState({ width: 0, height: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSubmenuId(null);
    setSubmenuAnchor(null);
  }, [menu?.id]);

  useLayoutEffect(() => {
    const element = menuRef.current;
    if (!element || !menu) return;
    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setMenuSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [menu, submenuId]);

  useLayoutEffect(() => {
    const element = submenuRef.current;
    if (!element) return;
    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setSubmenuSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [submenuId]);

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

    const margin = 8;
    const width = menuSize.width || 240;
    const height = menuSize.height || Math.min(520, menu.items.length * 52 + 16);
    const preferredLeft = menu.x + width + margin > window.innerWidth ? menu.x - width : menu.x;
    const availableAbove = Math.max(120, menu.y - margin * 2);
    const availableBelow = Math.max(120, window.innerHeight - menu.y - margin * 2);
    const openUpward = menu.y > window.innerHeight / 2 || height > availableBelow;
    const maxHeight = openUpward ? availableAbove : availableBelow;
    const renderedHeight = Math.min(height, maxHeight);
    const preferredTop = openUpward ? menu.y - renderedHeight : menu.y;
    return {
      left: Math.max(margin, Math.min(preferredLeft, window.innerWidth - width - margin)),
      top: Math.max(margin, Math.min(preferredTop, window.innerHeight - renderedHeight - margin)),
      maxHeight,
    };
  }, [menu, menuSize.height, menuSize.width]);

  const submenu = menu?.items.find((item) => item.id === submenuId)?.children;
  const submenuPosition = useMemo(() => {
    if (!submenuAnchor || typeof window === 'undefined') return undefined;
    const margin = 8;
    const gap = 8;
    const width = submenuSize.width || 220;
    const height = submenuSize.height || Math.min(520, (submenu?.length ?? 1) * 52 + 16);
    const openLeft = submenuAnchor.right + gap + width > window.innerWidth - margin;
    return {
      left: openLeft
        ? Math.max(margin, submenuAnchor.left - gap - width)
        : Math.min(submenuAnchor.right + gap, window.innerWidth - width - margin),
      top: Math.max(margin, Math.min(submenuAnchor.top, window.innerHeight - height - margin)),
      maxHeight: window.innerHeight - margin * 2,
    } satisfies CSSProperties;
  }, [submenu, submenuAnchor, submenuSize.height, submenuSize.width]);

  if (!menu) {
    return null;
  }

  return (
    <div className="wbn-floating-menu-wrap" data-floating-menu ref={menuRef} style={position}>
      <MenuPanel
        items={menu.items}
        closeMenu={closeMenu}
        onHoverSubmenu={(id, anchor) => {
          setSubmenuId(id);
          setSubmenuAnchor(anchor);
        }}
        submenuId={submenuId}
      />
      {submenu ? (
        <div className="wbn-floating-submenu" ref={submenuRef} style={submenuPosition}>
          <MenuPanel items={submenu} closeMenu={closeMenu} submenuId={submenuId} />
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
  onHoverSubmenu?: (id: string | null, anchor: DOMRect | null) => void;
  submenuId: string | null;
}) {
  return (
    <div className="wbn-floating-menu">
      {items.map((item) => (
        <button
          className={`wbn-menu-row${item.danger ? ' wbn-menu-row-danger' : ''}${submenuId === item.id ? ' wbn-menu-row-open' : ''}`}
          disabled={item.disabled}
          key={item.id}
          onFocus={(event) =>
            onHoverSubmenu?.(
              item.children ? item.id : null,
              item.children ? event.currentTarget.getBoundingClientRect() : null,
            )
          }
          onMouseEnter={(event) =>
            onHoverSubmenu?.(
              item.children ? item.id : null,
              item.children ? event.currentTarget.getBoundingClientRect() : null,
            )
          }
          onClick={() => {
            if (item.disabled || item.children) {
              return;
            }
            item.onSelect?.();
            closeMenu();
          }}
          type="button"
        >
          <IconFrame className="wbn-menu-icon">{item.icon}</IconFrame>
          <span>{item.label}</span>
          <IconFrame className="wbn-menu-trailing">
            {item.children ? <SubmenuChevron /> : item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
          </IconFrame>
        </button>
      ))}
    </div>
  );
}
