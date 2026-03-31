import { useEffect } from 'react';
import { useThemeStore } from '../domains/ui/store/useThemeStore';
import WorkspaceDesktop from '../features/workspace-desktop/ui/WorkspaceDesktop';

export default function KhaosBoxApp() {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return <WorkspaceDesktop />;
}
