import type { WorkspaceBoxIcon } from '../contracts/workspace';

export const BOX_ACCENT_PRESETS = [
  '#3b82f6',
  '#f97316',
  '#10b981',
  '#8b5cf6',
  '#f43f5e',
  '#f59e0b',
  '#06b6d4',
  '#6366f1',
] as const;

export const DEFAULT_BOX_ACCENT = '#64748b';

export const DEFAULT_BOX_ICON: WorkspaceBoxIcon = 'box';

export function chooseAvailableBoxAccent(usedAccents: Iterable<string>) {
  const used = new Set([...usedAccents].map((accent) => accent.toLowerCase()));
  const available = BOX_ACCENT_PRESETS.filter((accent) => !used.has(accent));
  return available.length
    ? available[Math.floor(Math.random() * available.length)]
    : DEFAULT_BOX_ACCENT;
}
