import { useEffect } from 'react';
import { resolveAppTheme } from '../domains/preferences/model/preferences';
import { runtimeDocumentPort } from './ports/defaultPorts';
import { usePreferencesStore } from './stores/usePreferencesStore';
import WorkspaceDesktop from '../features/workspace-desktop';

export default function KhaosBoxApp() {
  const theme = usePreferencesStore((state) => state.theme);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      runtimeDocumentPort.setTheme(resolveAppTheme(theme, mediaQuery.matches));
    };

    applyTheme();

    if (theme !== 'system') {
      return;
    }

    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme]);

  return <WorkspaceDesktop />;
}
