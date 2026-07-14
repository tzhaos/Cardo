import type { ReactNode } from 'react';
import { useUiStore } from '../app/stores/uiStore';
import { SidebarBrand } from './SidebarBrand';

/**
 * Titlebar is rendered by CardoApp (DesktopTitleBar).
 * This component owns the body row: sidebar column + main stage.
 *
 * Pass productNav (page list) and settingsFoot separately so the drop hit root
 * can wrap only product nav (Settings foot stays reachable, not a page drop target).
 *
 * Product name sits at the top of the left sidebar (SidebarBrand).
 * Collapse is driven by uiStore.sidebarCollapsed (titlebar toggle).
 */
export function AppShell({
  productNav,
  settingsFoot,
  main,
  webTitleLeading,
}: {
  productNav: ReactNode;
  settingsFoot: ReactNode;
  main: ReactNode;
  /** Browser host only: title leading chrome when DesktopTitleBar is absent. */
  webTitleLeading?: ReactNode;
}) {
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);

  return (
    <div
      className={[
        'cardo-shell-shell-body',
        sidebarCollapsed ? 'cardo-shell-shell-body-sidebar-collapsed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-sidebar-collapsed={sidebarCollapsed ? 'true' : undefined}
    >
      <div
        className={['cardo-shell-sidebar', sidebarCollapsed ? 'cardo-shell-sidebar-collapsed' : '']
          .filter(Boolean)
          .join(' ')}
        aria-hidden={sidebarCollapsed || undefined}
        // Prevent Tab into collapsed chrome (aria-hidden alone is not enough).
        // React types may lag the inert attribute.
        {...(sidebarCollapsed ? ({ inert: true } as Record<string, unknown>) : {})}
      >
        {webTitleLeading ? (
          <div className="cardo-shell-web-title-leading">{webTitleLeading}</div>
        ) : null}
        <SidebarBrand />
        {productNav}
        {settingsFoot}
      </div>
      {main}
    </div>
  );
}
