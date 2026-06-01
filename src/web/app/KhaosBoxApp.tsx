import { useEffect } from 'react';
import {
  getMicaColor,
  resolveAccentColor,
  resolveAppTheme,
  resolveFontFamily,
  resolveFontSize,
} from '../../core/domains/preferences/model/preferences';
import { runtimeDocumentPort } from './ports/defaultPorts';
import { usePreferencesStore } from './stores/usePreferencesStore';
import WorkspaceDesktop from '../features/workspace-desktop';

export default function KhaosBoxApp() {
  const theme = usePreferencesStore((state) => state.theme);
  const fontFamily = usePreferencesStore((state) => state.fontFamily);
  const fontSize = usePreferencesStore((state) => state.fontSize);
  const accentMode = usePreferencesStore((state) => state.accentMode);
  const accentColor = usePreferencesStore((state) => state.accentColor);
  const transparencyEnabled = usePreferencesStore((state) => state.transparencyEnabled);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const resolvedTheme = resolveAppTheme(theme, mediaQuery.matches);
      runtimeDocumentPort.setTheme(resolvedTheme);
      document.documentElement.style.setProperty(
        '--color-win-accent',
        resolveAccentColor(resolvedTheme, accentMode, accentColor),
      );
      document.documentElement.style.setProperty(
        '--color-win-mica',
        getMicaColor(resolvedTheme, transparencyEnabled),
      );
      document.documentElement.style.setProperty('--kb-font-family', resolveFontFamily(fontFamily));
      document.documentElement.style.setProperty('--kb-font-size', resolveFontSize(fontSize));
    };

    applyTheme();

    if (theme !== 'system') {
      return;
    }

    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [accentColor, accentMode, fontFamily, fontSize, theme, transparencyEnabled]);

  return <WorkspaceDesktop />;
}
