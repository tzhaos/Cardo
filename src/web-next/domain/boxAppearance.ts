import type { WorkspaceBox, WorkspaceBoxIcon, WorkspaceBoxPreset } from './workspace';

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

export const BOX_ICON_PRESETS: WorkspaceBoxIcon[] = [
  'box',
  'folder',
  'bookmark',
  'clipboard',
  'briefcase',
  'code',
  'image',
  'music',
  'book',
  'idea',
  'star',
  'heart',
];

export function isWorkspaceBoxIcon(value: unknown): value is WorkspaceBoxIcon {
  return typeof value === 'string' && BOX_ICON_PRESETS.includes(value as WorkspaceBoxIcon);
}

export function normalizeBoxAccent(value: string) {
  const trimmed = value.trim();
  const hex = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex
      .split('')
      .map((character) => `${character}${character}`)
      .join('')}`.toLowerCase();
  }
  return /^[0-9a-fA-F]{6}$/.test(hex) ? `#${hex.toLowerCase()}` : null;
}

export function getBoxAccent(box: Pick<WorkspaceBox, 'accent' | 'preset'>) {
  return normalizeBoxAccent(box.accent ?? '') ?? getLegacyPresetAccent(box.preset);
}

export function getBoxIcon(box: Pick<WorkspaceBox, 'icon' | 'preset'>): WorkspaceBoxIcon {
  return box.icon ?? getLegacyPresetIcon(box.preset);
}

export function chooseAvailableBoxAccent(boxes: Pick<WorkspaceBox, 'accent' | 'preset'>[]) {
  const usedAccents = new Set(boxes.map((box) => getBoxAccent(box).toLowerCase()));
  const availableAccents = BOX_ACCENT_PRESETS.filter((accent) => !usedAccents.has(accent));
  if (!availableAccents.length) return DEFAULT_BOX_ACCENT;
  return availableAccents[Math.floor(Math.random() * availableAccents.length)]!;
}

function getLegacyPresetAccent(preset: WorkspaceBoxPreset) {
  switch (preset) {
    case 'folder':
      return '#3b82f6';
    case 'bookmark':
      return '#f97316';
    case 'clipboard':
      return '#10b981';
    case 'general':
      return '#8b5cf6';
  }
}

function getLegacyPresetIcon(preset: WorkspaceBoxPreset): WorkspaceBoxIcon {
  switch (preset) {
    case 'folder':
      return 'folder';
    case 'bookmark':
      return 'bookmark';
    case 'clipboard':
      return 'clipboard';
    case 'general':
      return 'box';
  }
}
