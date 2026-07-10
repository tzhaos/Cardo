import {
  BookOpen,
  Bookmark,
  BriefcaseBusiness,
  Clipboard,
  Code2,
  Folder,
  Heart,
  Image,
  Lightbulb,
  Music2,
  PackageOpen,
  Star,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { WorkspaceBoxIcon } from '../../domain/workspace';

const BOX_ICON_COMPONENTS = {
  box: PackageOpen,
  folder: Folder,
  bookmark: Bookmark,
  clipboard: Clipboard,
  briefcase: BriefcaseBusiness,
  code: Code2,
  image: Image,
  music: Music2,
  book: BookOpen,
  idea: Lightbulb,
  star: Star,
  heart: Heart,
} satisfies Record<WorkspaceBoxIcon, ComponentType<{ size?: number }>>;

export function BoxAppearanceIcon({ icon, size = 16 }: { icon: WorkspaceBoxIcon; size?: number }) {
  const Icon = BOX_ICON_COMPONENTS[icon];
  return <Icon size={size} />;
}
