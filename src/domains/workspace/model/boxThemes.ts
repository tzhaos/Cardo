import type { MessageKey } from '../../i18n/model/messages';
import type { AppTheme } from '../../ui/model/theme';
import type { BoxThemeId } from '../../../types/box';

interface BoxThemeDefinition {
  id: BoxThemeId;
  surface: Record<AppTheme, string>;
  preview: Record<AppTheme, string>;
  dockIcon: string;
  labelKey: MessageKey;
}

export const DEFAULT_BOX_THEME: BoxThemeId = 'dark';

export const BOX_THEMES: BoxThemeDefinition[] = [
  {
    id: 'dark',
    surface: {
      dark: 'bg-zinc-900/90 border-zinc-700',
      light: 'bg-white/92 border-slate-200',
    },
    preview: {
      dark: 'border-zinc-600 bg-zinc-800',
      light: 'border-slate-300 bg-white',
    },
    dockIcon: 'bg-gradient-to-br from-slate-500 to-slate-700',
    labelKey: 'theme.dark',
  },
  {
    id: 'blue',
    surface: {
      dark: 'bg-blue-950/90 border-blue-800',
      light: 'bg-blue-50/95 border-blue-200',
    },
    preview: {
      dark: 'border-blue-700 bg-blue-800',
      light: 'border-blue-300 bg-blue-100',
    },
    dockIcon: 'bg-gradient-to-br from-blue-400 to-blue-600',
    labelKey: 'theme.blue',
  },
  {
    id: 'emerald',
    surface: {
      dark: 'bg-emerald-950/90 border-emerald-800',
      light: 'bg-emerald-50/95 border-emerald-200',
    },
    preview: {
      dark: 'border-emerald-700 bg-emerald-800',
      light: 'border-emerald-300 bg-emerald-100',
    },
    dockIcon: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
    labelKey: 'theme.emerald',
  },
  {
    id: 'rose',
    surface: {
      dark: 'bg-rose-950/90 border-rose-800',
      light: 'bg-rose-50/95 border-rose-200',
    },
    preview: {
      dark: 'border-rose-700 bg-rose-800',
      light: 'border-rose-300 bg-rose-100',
    },
    dockIcon: 'bg-gradient-to-br from-rose-400 to-rose-600',
    labelKey: 'theme.rose',
  },
  {
    id: 'amber',
    surface: {
      dark: 'bg-amber-950/90 border-amber-800',
      light: 'bg-amber-50/95 border-amber-200',
    },
    preview: {
      dark: 'border-amber-700 bg-amber-800',
      light: 'border-amber-300 bg-amber-100',
    },
    dockIcon: 'bg-gradient-to-br from-amber-400 to-amber-600',
    labelKey: 'theme.amber',
  },
  {
    id: 'purple',
    surface: {
      dark: 'bg-purple-950/90 border-purple-800',
      light: 'bg-violet-50/95 border-violet-200',
    },
    preview: {
      dark: 'border-purple-700 bg-purple-800',
      light: 'border-violet-300 bg-violet-100',
    },
    dockIcon: 'bg-gradient-to-br from-purple-400 to-purple-600',
    labelKey: 'theme.purple',
  },
  {
    id: 'cyan',
    surface: {
      dark: 'bg-cyan-950/90 border-cyan-800',
      light: 'bg-cyan-50/95 border-cyan-200',
    },
    preview: {
      dark: 'border-cyan-700 bg-cyan-800',
      light: 'border-cyan-300 bg-cyan-100',
    },
    dockIcon: 'bg-gradient-to-br from-cyan-400 to-cyan-600',
    labelKey: 'theme.cyan',
  },
  {
    id: 'fuchsia',
    surface: {
      dark: 'bg-fuchsia-950/90 border-fuchsia-800',
      light: 'bg-fuchsia-50/95 border-fuchsia-200',
    },
    preview: {
      dark: 'border-fuchsia-700 bg-fuchsia-800',
      light: 'border-fuchsia-300 bg-fuchsia-100',
    },
    dockIcon: 'bg-gradient-to-br from-fuchsia-400 to-fuchsia-600',
    labelKey: 'theme.fuchsia',
  },
  {
    id: 'grad-dark',
    surface: {
      dark: 'bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 border-zinc-700',
      light: 'bg-gradient-to-br from-slate-50/95 via-white/95 to-slate-100/95 border-slate-200',
    },
    preview: {
      dark: 'border-zinc-500 bg-gradient-to-br from-zinc-700 to-zinc-600',
      light: 'border-slate-300 bg-gradient-to-br from-slate-100 to-white',
    },
    dockIcon: 'bg-gradient-to-br from-slate-500 to-slate-700',
    labelKey: 'theme.gradDark',
  },
  {
    id: 'grad-cosmic',
    surface: {
      dark: 'bg-gradient-to-br from-indigo-950/95 to-purple-900/95 border-indigo-800',
      light: 'bg-gradient-to-br from-indigo-50/95 to-fuchsia-50/95 border-indigo-200',
    },
    preview: {
      dark: 'border-indigo-700 bg-gradient-to-br from-indigo-800 to-purple-700',
      light: 'border-indigo-300 bg-gradient-to-br from-indigo-100 to-fuchsia-100',
    },
    dockIcon: 'bg-gradient-to-br from-indigo-400 to-purple-600',
    labelKey: 'theme.gradCosmic',
  },
  {
    id: 'grad-sunset',
    surface: {
      dark: 'bg-gradient-to-br from-orange-950/95 to-red-900/95 border-orange-800',
      light: 'bg-gradient-to-br from-orange-50/95 to-rose-50/95 border-orange-200',
    },
    preview: {
      dark: 'border-orange-700 bg-gradient-to-br from-orange-700 to-red-700',
      light: 'border-orange-300 bg-gradient-to-br from-orange-100 to-rose-100',
    },
    dockIcon: 'bg-gradient-to-br from-orange-400 to-red-600',
    labelKey: 'theme.gradSunset',
  },
  {
    id: 'grad-ocean',
    surface: {
      dark: 'bg-gradient-to-br from-cyan-950/95 to-blue-900/95 border-cyan-800',
      light: 'bg-gradient-to-br from-cyan-50/95 to-blue-50/95 border-cyan-200',
    },
    preview: {
      dark: 'border-cyan-700 bg-gradient-to-br from-cyan-700 to-blue-700',
      light: 'border-cyan-300 bg-gradient-to-br from-cyan-100 to-blue-100',
    },
    dockIcon: 'bg-gradient-to-br from-cyan-400 to-blue-600',
    labelKey: 'theme.gradOcean',
  },
];

const BOX_THEME_LOOKUP = Object.fromEntries(BOX_THEMES.map((theme) => [theme.id, theme])) as Record<
  BoxThemeId,
  BoxThemeDefinition
>;

export function resolveBoxTheme(theme: string | null | undefined): BoxThemeId {
  return theme && theme in BOX_THEME_LOOKUP ? (theme as BoxThemeId) : DEFAULT_BOX_THEME;
}

export function getBoxThemeSurfaceClass(theme: BoxThemeId, appTheme: AppTheme) {
  return BOX_THEME_LOOKUP[theme].surface[appTheme];
}

export function getBoxThemePreviewClass(theme: BoxThemeId, appTheme: AppTheme) {
  return BOX_THEME_LOOKUP[theme].preview[appTheme];
}

export function getBoxThemeDockIconClass(theme: BoxThemeId) {
  return BOX_THEME_LOOKUP[theme].dockIcon;
}
