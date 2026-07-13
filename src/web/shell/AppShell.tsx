import type { ReactNode } from 'react';

/**
 * Titlebar is rendered by CardoApp (DesktopTitleBar).
 * This component owns the body row: sidebar column + main stage.
 *
 * Pass productNav (page list) and settingsFoot separately so the drop hit root
 * can wrap only product nav (Settings foot stays reachable, not a page drop target).
 */
export function AppShell({
  productNav,
  settingsFoot,
  main,
}: {
  productNav: ReactNode;
  settingsFoot: ReactNode;
  main: ReactNode;
}) {
  return (
    <div className="cardo-v2-shell-body">
      <div className="cardo-v2-sidebar">
        {productNav}
        {settingsFoot}
      </div>
      {main}
    </div>
  );
}
