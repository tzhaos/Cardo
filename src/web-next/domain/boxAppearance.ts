import { workspaceBoxIconSchema } from '../../core/contracts/workspace';
import {
  BOX_ACCENT_PRESETS,
  DEFAULT_BOX_ACCENT,
  chooseAvailableBoxAccent as chooseAccent,
} from '../../core/domains/boxAppearance';
import type { WorkspaceBox, WorkspaceBoxIcon } from './workspace';

export { BOX_ACCENT_PRESETS, DEFAULT_BOX_ACCENT };

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
  return workspaceBoxIconSchema.safeParse(value).success;
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

export function getBoxAccent(box: Pick<WorkspaceBox, 'accent'>) {
  return box.accent;
}

export function getBoxIcon(box: Pick<WorkspaceBox, 'icon'>): WorkspaceBoxIcon {
  return box.icon;
}

export function chooseAvailableBoxAccent(boxes: Pick<WorkspaceBox, 'accent'>[]) {
  return chooseAccent(boxes.map((box) => box.accent));
}
