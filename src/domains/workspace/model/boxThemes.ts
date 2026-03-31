import type { MessageKey } from '../../i18n/model/messages';

export const BOX_THEMES: Array<{
  id: string;
  class: string;
  preview: string;
  labelKey: MessageKey;
}> = [
  {
    id: 'dark',
    class: 'bg-zinc-900/90 border-zinc-700',
    preview: 'bg-zinc-800',
    labelKey: 'theme.dark',
  },
  {
    id: 'blue',
    class: 'bg-blue-950/90 border-blue-800',
    preview: 'bg-blue-800',
    labelKey: 'theme.blue',
  },
  {
    id: 'emerald',
    class: 'bg-emerald-950/90 border-emerald-800',
    preview: 'bg-emerald-800',
    labelKey: 'theme.emerald',
  },
  {
    id: 'rose',
    class: 'bg-rose-950/90 border-rose-800',
    preview: 'bg-rose-800',
    labelKey: 'theme.rose',
  },
  {
    id: 'amber',
    class: 'bg-amber-950/90 border-amber-800',
    preview: 'bg-amber-800',
    labelKey: 'theme.amber',
  },
  {
    id: 'purple',
    class: 'bg-purple-950/90 border-purple-800',
    preview: 'bg-purple-800',
    labelKey: 'theme.purple',
  },
  {
    id: 'cyan',
    class: 'bg-cyan-950/90 border-cyan-800',
    preview: 'bg-cyan-800',
    labelKey: 'theme.cyan',
  },
  {
    id: 'fuchsia',
    class: 'bg-fuchsia-950/90 border-fuchsia-800',
    preview: 'bg-fuchsia-800',
    labelKey: 'theme.fuchsia',
  },
  {
    id: 'grad-dark',
    class: 'bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 border-zinc-700',
    preview: 'bg-gradient-to-br from-zinc-700 to-zinc-600',
    labelKey: 'theme.gradDark',
  },
  {
    id: 'grad-cosmic',
    class: 'bg-gradient-to-br from-indigo-950/95 to-purple-900/95 border-indigo-800',
    preview: 'bg-gradient-to-br from-indigo-800 to-purple-700',
    labelKey: 'theme.gradCosmic',
  },
  {
    id: 'grad-sunset',
    class: 'bg-gradient-to-br from-orange-950/95 to-red-900/95 border-orange-800',
    preview: 'bg-gradient-to-br from-orange-700 to-red-700',
    labelKey: 'theme.gradSunset',
  },
  {
    id: 'grad-ocean',
    class: 'bg-gradient-to-br from-cyan-950/95 to-blue-900/95 border-cyan-800',
    preview: 'bg-gradient-to-br from-cyan-700 to-blue-700',
    labelKey: 'theme.gradOcean',
  },
];
