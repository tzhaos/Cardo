import type { WorkspaceBoxIcon } from '../../domain/workspace';
import { ThemeIcon } from '../../kit/icon';
import type { ThemeIconName } from '../../kit/icon';

const BOX_ICON_NAMES = {
  box: 'box',
  folder: 'folder',
  bookmark: 'bookmark',
  clipboard: 'clipboard',
  briefcase: 'briefcase',
  code: 'code',
  image: 'image',
  music: 'music',
  book: 'book',
  idea: 'idea',
  star: 'star',
  heart: 'heart',
} satisfies Record<WorkspaceBoxIcon, ThemeIconName>;

/** Box decorative icons follow the active theme icon pack (official when available). */
export function BoxAppearanceIcon({ icon, size = 16 }: { icon: WorkspaceBoxIcon; size?: number }) {
  return <ThemeIcon name={BOX_ICON_NAMES[icon]} size={size} />;
}
