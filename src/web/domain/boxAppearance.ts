import {
  DEFAULT_BOX_ACCENT,
  chooseAvailableBoxAccent as chooseAccent,
} from '../../core/domains/boxAppearance';
import type { WorkspaceBox, WorkspaceBoxIcon } from './workspace';

export { DEFAULT_BOX_ACCENT };
/** @deprecated Product forbids custom accents — always default gray. */
export const BOX_ACCENT_PRESETS = [DEFAULT_BOX_ACCENT] as const;

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

/** Always product default gray — stored accent values are ignored. */
export function getBoxAccent(_box?: Pick<WorkspaceBox, 'accent'>) {
  return DEFAULT_BOX_ACCENT;
}

export function getBoxIcon(box: Pick<WorkspaceBox, 'icon'>): WorkspaceBoxIcon {
  return box.icon;
}

export function chooseAvailableBoxAccent(_boxes?: Pick<WorkspaceBox, 'accent'>[]) {
  return chooseAccent();
}

/** Accents are fixed; any input maps to the default gray. */
export function normalizeBoxAccent(_value: string) {
  return DEFAULT_BOX_ACCENT;
}
