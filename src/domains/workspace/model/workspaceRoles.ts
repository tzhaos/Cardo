import type { BoxData, SystemBoxRole } from '../../../types/box';

export const SYSTEM_BOX_ROLES: SystemBoxRole[] = ['folders', 'links', 'notes'];

const LEGACY_ID_TO_ROLE: Record<string, SystemBoxRole> = {
  folders: 'folders',
  webpages: 'links',
  clipboard: 'notes',
};

export function inferSystemBoxRole(box: Pick<BoxData, 'id' | 'role'>) {
  if (box.role && SYSTEM_BOX_ROLES.includes(box.role)) {
    return box.role;
  }

  return LEGACY_ID_TO_ROLE[box.id] ?? null;
}
