import type { BoxData } from '../../../types/box';
import { MESSAGES, NEW_BOX_TITLE_KEY, SYSTEM_BOX_TITLE_KEYS } from '../../i18n/model/messages';
import { inferSystemBoxRole } from './workspaceRoles';

const ENGLISH_BOX_TITLES = {
  [SYSTEM_BOX_TITLE_KEYS.folders]: MESSAGES.en[SYSTEM_BOX_TITLE_KEYS.folders],
  [SYSTEM_BOX_TITLE_KEYS.links]: MESSAGES.en[SYSTEM_BOX_TITLE_KEYS.links],
  [SYSTEM_BOX_TITLE_KEYS.notes]: MESSAGES.en[SYSTEM_BOX_TITLE_KEYS.notes],
  [NEW_BOX_TITLE_KEY]: MESSAGES.en[NEW_BOX_TITLE_KEY],
} as const;

export const DEFAULT_SYSTEM_BOX_TITLES = {
  folders: ENGLISH_BOX_TITLES[SYSTEM_BOX_TITLE_KEYS.folders],
  links: ENGLISH_BOX_TITLES[SYSTEM_BOX_TITLE_KEYS.links],
  notes: ENGLISH_BOX_TITLES[SYSTEM_BOX_TITLE_KEYS.notes],
} as const;

export const DEFAULT_NEW_BOX_TITLE = ENGLISH_BOX_TITLES[NEW_BOX_TITLE_KEY];

function getSystemTitleKey(box: Pick<BoxData, 'id' | 'role'>) {
  const role = inferSystemBoxRole(box);

  return role ? SYSTEM_BOX_TITLE_KEYS[role] : null;
}

function getEnglishTitleForKey(titleKey: string | null | undefined) {
  if (!titleKey) {
    return null;
  }

  return ENGLISH_BOX_TITLES[titleKey as keyof typeof ENGLISH_BOX_TITLES] ?? null;
}

export function normalizeBoxTitle(box: BoxData): BoxData {
  const systemTitleKey = getSystemTitleKey(box);
  const englishSystemTitle = systemTitleKey ? getEnglishTitleForKey(systemTitleKey) : null;
  const englishNewBoxTitle = getEnglishTitleForKey(NEW_BOX_TITLE_KEY);
  const localizedSystemTitles = systemTitleKey
    ? Object.values(MESSAGES).map((dictionary) => dictionary[systemTitleKey])
    : [];
  const localizedNewBoxTitles = englishNewBoxTitle
    ? Object.values(MESSAGES).map((dictionary) => dictionary[NEW_BOX_TITLE_KEY])
    : [];

  if (box.titleKey) {
    const englishTitleFromKey = getEnglishTitleForKey(box.titleKey);

    if (englishTitleFromKey) {
      return {
        ...box,
        title: englishTitleFromKey,
        titleKey: null,
      };
    }
  }

  if (systemTitleKey && (!box.title || localizedSystemTitles.includes(box.title))) {
    return {
      ...box,
      title: englishSystemTitle ?? box.title,
      titleKey: null,
    };
  }

  if (
    box.id.startsWith('box-') &&
    englishNewBoxTitle &&
    (!box.title || localizedNewBoxTitles.includes(box.title))
  ) {
    return {
      ...box,
      title: englishNewBoxTitle,
      titleKey: null,
    };
  }

  return {
    ...box,
    role: inferSystemBoxRole(box),
    titleKey: null,
  };
}

export function normalizeBoxes(boxes: BoxData[]) {
  return boxes.map(normalizeBoxTitle);
}

export function getBoxDisplayTitle(box: Pick<BoxData, 'title'>) {
  return box.title;
}
