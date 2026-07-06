import {
  ACCENT_MODES,
  APP_FONT_FAMILIES,
  APP_FONT_SIZES,
  APP_LOCALES,
  APP_THEMES,
  DEFAULT_PREFERENCES,
  pushRecentAccentColor,
  type PreferencesState,
} from '../domains/preferences/model/preferences';
import type {
  WorkspaceExportDocumentV5,
  WorkspaceSnapshot,
} from '../domains/workspace/model/workspace';
import {
  createWorkspaceExportDocument,
  parseWorkspaceExportDocument,
} from '../domains/workspace/model/workspaceCodec';

export type SyncedPreferences = Pick<
  PreferencesState,
  | 'theme'
  | 'locale'
  | 'fontFamily'
  | 'fontSize'
  | 'accentMode'
  | 'accentColor'
  | 'recentAccentColors'
  | 'transparencyEnabled'
>;

export interface WorkspaceSyncDocumentV1 {
  version: 1;
  exportedAt: string;
  workspace: WorkspaceExportDocumentV5;
  preferences: SyncedPreferences;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function pickSyncedPreferences(preferences: PreferencesState): SyncedPreferences {
  const {
    theme,
    locale,
    fontFamily,
    fontSize,
    accentMode,
    accentColor,
    recentAccentColors,
    transparencyEnabled,
  } = preferences;

  return {
    theme,
    locale,
    fontFamily,
    fontSize,
    accentMode,
    accentColor,
    recentAccentColors,
    transparencyEnabled,
  };
}

export function createWorkspaceSyncDocument(
  snapshot: Pick<
    WorkspaceSnapshot,
    | 'boxesById'
    | 'boxOrder'
    | 'boxViewStatesById'
    | 'itemsById'
    | 'itemPlacementsByBoxId'
    | 'bookmarksById'
    | 'bookmarkFoldersById'
    | 'bookmarkFolderOrder'
  >,
  preferences: PreferencesState,
  exportedAt: string,
): WorkspaceSyncDocumentV1 {
  return {
    version: 1,
    exportedAt,
    workspace: createWorkspaceExportDocument(snapshot),
    preferences: pickSyncedPreferences(preferences),
  };
}

export function sanitizeSyncedPreferences(input: unknown): SyncedPreferences {
  const record = isRecord(input) ? input : {};
  const theme =
    typeof record.theme === 'string' && APP_THEMES.includes(record.theme as never)
      ? (record.theme as PreferencesState['theme'])
      : DEFAULT_PREFERENCES.theme;
  const locale =
    typeof record.locale === 'string' && APP_LOCALES.includes(record.locale as never)
      ? (record.locale as PreferencesState['locale'])
      : DEFAULT_PREFERENCES.locale;
  const fontFamily =
    typeof record.fontFamily === 'string' && APP_FONT_FAMILIES.includes(record.fontFamily as never)
      ? (record.fontFamily as PreferencesState['fontFamily'])
      : DEFAULT_PREFERENCES.fontFamily;
  const fontSize =
    typeof record.fontSize === 'string' && APP_FONT_SIZES.includes(record.fontSize as never)
      ? (record.fontSize as PreferencesState['fontSize'])
      : DEFAULT_PREFERENCES.fontSize;
  const accentMode =
    typeof record.accentMode === 'string' && ACCENT_MODES.includes(record.accentMode as never)
      ? (record.accentMode as PreferencesState['accentMode'])
      : DEFAULT_PREFERENCES.accentMode;
  const accentColor =
    typeof record.accentColor === 'string' && record.accentColor.trim()
      ? record.accentColor
      : DEFAULT_PREFERENCES.accentColor;
  const recentAccentColors = Array.isArray(record.recentAccentColors)
    ? record.recentAccentColors.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      )
    : DEFAULT_PREFERENCES.recentAccentColors;
  const transparencyEnabled =
    typeof record.transparencyEnabled === 'boolean'
      ? record.transparencyEnabled
      : DEFAULT_PREFERENCES.transparencyEnabled;

  return {
    theme,
    locale,
    fontFamily,
    fontSize,
    accentMode,
    accentColor,
    recentAccentColors: pushRecentAccentColor(recentAccentColors, accentColor),
    transparencyEnabled,
  };
}

export function parseWorkspaceSyncDocument(
  input: unknown,
  fallbackExportedAt: string,
): WorkspaceSyncDocumentV1 {
  if (!isRecord(input) || input.version !== 1) {
    throw new Error('Invalid WebDAV sync document');
  }

  return {
    version: 1,
    exportedAt: typeof input.exportedAt === 'string' ? input.exportedAt : fallbackExportedAt,
    workspace: parseWorkspaceExportDocument(input.workspace),
    preferences: sanitizeSyncedPreferences(input.preferences),
  };
}
