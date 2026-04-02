import { useEffect } from 'react';
import { runtimeDocumentPort } from './ports/defaultPorts';
import { usePreferencesStore } from './stores/usePreferencesStore';
import WorkspaceDesktop from '../features/workspace-desktop/ui/WorkspaceDesktop';

export default function KhaosBoxApp() {
  const theme = usePreferencesStore((state) => state.theme);

  useEffect(() => {
    runtimeDocumentPort.setTheme(theme);
  }, [theme]);

  return <WorkspaceDesktop />;
}
