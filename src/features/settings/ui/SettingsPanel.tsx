import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Cloud,
  CloudDownload,
  CloudUpload,
  Database,
  Download,
  Info,
  Languages,
  Palette,
  Settings,
  Sparkles,
  Type,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { useI18n } from '../../../app/hooks/useI18n';
import { usePreferencesStore } from '../../../app/stores/usePreferencesStore';
import { useSettingsPanelStore } from '../../../app/stores/useSettingsPanelStore';
import { exportWorkspace } from '../../../app/use-cases/exportWorkspace';
import { importWorkspace } from '../../../app/use-cases/importWorkspace';
import {
  buildCurrentWebDavConfig,
  downloadWorkspaceFromWebDav,
  safeSyncErrorMessage,
  testWebDavConnection,
  uploadWorkspaceToWebDav,
} from '../../../app/use-cases/syncWorkspaceWebDav';
import {
  APP_FONT_SIZES,
  DEFAULT_DARK_ACCENT_COLOR,
  DEFAULT_LIGHT_ACCENT_COLOR,
  type AccentMode,
  type AppFontFamily,
  type AppFontSize,
  type AppTheme,
  type ResolvedAppTheme,
  resolveAppTheme,
} from '../../../domains/preferences/model/preferences';
import { WORKSPACE_SCHEMA_VERSION } from '../../../domains/workspace/model/workspace';
import { cn } from '../../../lib/utils';

type SettingsTab = 'general' | 'theme' | 'data' | 'about';
type LocaleValue = 'en' | 'zh';

interface SelectOption<Value extends string> {
  label: string;
  value: Value;
}

interface SegmentedOption<Value extends string> {
  label: string;
  value: Value;
}

const ACCENT_SWATCHES = [
  '#005fb8',
  '#0f6cbd',
  '#038387',
  '#0b6a0b',
  '#498205',
  '#8764b8',
  '#7a1cac',
  '#c239b3',
  '#e3008c',
  '#ca5010',
  '#f7630c',
  '#da3b01',
  '#c50f1f',
  '#a63a46',
  '#8e562e',
  '#69797e',
];

function useResolvedTheme(theme: AppTheme) {
  const [prefersDark, setPrefersDark] = useState(
    () =>
      typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updatePreference = () => setPrefersDark(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  return resolveAppTheme(theme, prefersDark);
}

function WinSelect<Value extends string>({
  value,
  options,
  onChange,
}: {
  value: Value;
  options: SelectOption<Value>[];
  onChange: (value: Value) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLabel = options.find((option) => option.value === value)?.label ?? options[0]?.label;

  return (
    <div className="relative" ref={selectRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-w-[140px] items-center justify-between gap-6 rounded-md border border-win-border-strong bg-win-bg-secondary px-3 py-1.5 text-sm transition-colors hover:bg-win-hover active:bg-win-active"
      >
        <span className="text-win-text">{activeLabel}</span>
        <ChevronDown className="h-4 w-4 text-win-text-secondary" />
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-md border border-win-border bg-win-mica py-1 shadow-win-flyout backdrop-blur-xl"
          >
            {options.map((option) => {
              const isActive = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className="group relative flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors hover:bg-win-hover"
                >
                  {isActive ? (
                    <div className="absolute left-0 top-1/2 h-3/5 w-1 -translate-y-1/2 rounded-r-full bg-win-accent" />
                  ) : null}
                  <span
                    className={cn(
                      'pl-2',
                      isActive
                        ? 'font-medium text-win-text'
                        : 'text-win-text-secondary group-hover:text-win-text',
                    )}
                  >
                    {option.label}
                  </span>
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SegmentedControl<Value extends string>({
  value,
  options,
  onChange,
}: {
  value: Value;
  options: SegmentedOption<Value>[];
  onChange: (value: Value) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-win-border bg-win-bg-secondary p-1 shadow-win-button">
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm transition-colors',
              isActive
                ? 'bg-win-active text-win-text'
                : 'text-win-text-secondary hover:bg-win-hover',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      <span
        className={cn(
          'relative flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-win-accent' : 'bg-win-active',
        )}
      >
        <span
          className={cn(
            'absolute h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  );
}

function SettingRow({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: string;
  action: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-win-border bg-win-card p-4 shadow-sm">
      <div className="flex items-center gap-4">
        {icon}
        <span className="text-sm font-medium text-win-text">{title}</span>
      </div>
      {action}
    </div>
  );
}

function ActionRow({
  icon,
  title,
  onClick,
  roundedClassName,
}: {
  icon: ReactNode;
  title: string;
  onClick: () => void;
  roundedClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-between p-4 text-left transition-colors hover:bg-win-hover',
        roundedClassName,
      )}
    >
      <div className="flex items-center gap-4">
        {icon}
        <span className="text-sm font-medium text-win-text">{title}</span>
      </div>
      <ChevronRight className="h-5 w-5 text-win-text-secondary" />
    </button>
  );
}

function ThemePreviewCard({
  resolvedTheme,
  transparencyEnabled,
}: {
  resolvedTheme: ResolvedAppTheme;
  transparencyEnabled: boolean;
}) {
  return (
    <div className="rounded-xl border border-win-border bg-win-card p-4 shadow-sm">
      <div
        className={cn(
          'relative overflow-hidden rounded-[20px] border border-black/50 bg-[#0b0b0b] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
          resolvedTheme === 'light' ? 'border-slate-300/70 bg-[#dfe8f3]' : '',
        )}
      >
        <div
          className={cn(
            'absolute inset-0',
            resolvedTheme === 'dark'
              ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_38%),linear-gradient(135deg,#0e1823_0%,#2a171b_100%)]'
              : 'bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.75),transparent_40%),linear-gradient(135deg,#f9fbfe_0%,#d7e3ef_100%)]',
          )}
        />
        <div className="relative z-[1] space-y-3">
          <div className="flex items-start justify-between">
            <div
              className={cn(
                'flex w-[58%] flex-col gap-2 rounded-2xl border px-3 py-3',
                transparencyEnabled ? 'win-mica' : 'bg-win-card',
              )}
            >
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-sm bg-win-text" />
                <div className="h-2.5 w-20 rounded-full bg-win-text/80" />
              </div>
              <div className="space-y-1.5">
                <div className="h-2 rounded-full bg-win-text-secondary/70" />
                <div className="h-2 w-4/5 rounded-full bg-win-text-secondary/50" />
              </div>
            </div>

            <div className="w-[34%] space-y-2 pt-2">
              <div className="h-2 rounded-full bg-win-text/75" />
              <div className="h-2 rounded-full bg-win-text/55" />
              <div className="h-2 w-4/5 rounded-full bg-win-text/40" />
            </div>
          </div>

          <div
            className={cn(
              'mx-auto flex w-[78%] items-center gap-2 rounded-2xl border px-2 py-2',
              transparencyEnabled ? 'win-mica' : 'bg-win-card',
            )}
          >
            <div className="h-8 w-8 rounded-xl bg-win-hover" />
            <div className="h-8 w-8 rounded-xl bg-win-hover" />
            <div className="relative flex h-8 w-12 items-center justify-center rounded-xl bg-win-hover">
              <div className="absolute bottom-0 h-1 w-4 rounded-full bg-win-accent" />
            </div>
            <div className="ml-auto h-8 w-8 rounded-xl bg-win-hover" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AccentPalette({
  colors,
  value,
  onChange,
}: {
  colors: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-8 gap-2">
      {colors.map((color) => {
        const isActive = value.toLowerCase() === color.toLowerCase();

        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg border transition-transform hover:scale-[1.04]',
              isActive ? 'border-win-text shadow-win-button' : 'border-black/10',
            )}
            style={{ backgroundColor: color }}
            aria-label={color}
            title={color}
          >
            {isActive ? <Check className="h-4 w-4 text-white drop-shadow" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function ThemePanel() {
  const { locale } = useI18n();
  const theme = usePreferencesStore((state) => state.theme);
  const setTheme = usePreferencesStore((state) => state.setTheme);
  const accentMode = usePreferencesStore((state) => state.accentMode);
  const setAccentMode = usePreferencesStore((state) => state.setAccentMode);
  const accentColor = usePreferencesStore((state) => state.accentColor);
  const setAccentColor = usePreferencesStore((state) => state.setAccentColor);
  const recentAccentColors = usePreferencesStore((state) => state.recentAccentColors);
  const transparencyEnabled = usePreferencesStore((state) => state.transparencyEnabled);
  const setTransparencyEnabled = usePreferencesStore((state) => state.setTransparencyEnabled);
  const resolvedTheme = useResolvedTheme(theme);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const copy =
    locale === 'zh'
      ? {
          previewTitle: '\u9884\u89c8',
          modeTitle: '\u6a21\u5f0f',
          transparencyTitle: '\u900f\u660e',
          accentModeTitle: '\u5f3a\u8c03\u8272',
          recentColorsTitle: '\u6700\u8fd1\u4f7f\u7528',
          paletteTitle: '\u989c\u8272\u677f',
          customColorTitle: '\u81ea\u5b9a\u4e49',
          modeOptions: [
            { label: '\u6d45\u8272', value: 'light' },
            { label: '\u6df1\u8272', value: 'dark' },
            { label: '\u8ddf\u968f\u7cfb\u7edf', value: 'system' },
          ] as const satisfies SegmentedOption<AppTheme>[],
          accentModeOptions: [
            { label: '\u81ea\u52a8', value: 'auto' },
            { label: '\u624b\u52a8', value: 'manual' },
          ] as const satisfies SegmentedOption<AccentMode>[],
        }
      : {
          previewTitle: 'Preview',
          modeTitle: 'Mode',
          transparencyTitle: 'Transparency',
          accentModeTitle: 'Accent',
          recentColorsTitle: 'Recent',
          paletteTitle: 'Palette',
          customColorTitle: 'Custom',
          modeOptions: [
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
            { label: 'System', value: 'system' },
          ] as const satisfies SegmentedOption<AppTheme>[],
          accentModeOptions: [
            { label: 'Auto', value: 'auto' },
            { label: 'Manual', value: 'manual' },
          ] as const satisfies SegmentedOption<AccentMode>[],
        };

  const recentColors = Array.from(
    new Set([
      ...recentAccentColors,
      DEFAULT_DARK_ACCENT_COLOR,
      DEFAULT_LIGHT_ACCENT_COLOR,
      accentColor,
    ]),
  ).slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <div className="px-1 text-sm font-semibold text-win-text">{copy.previewTitle}</div>
      <ThemePreviewCard resolvedTheme={resolvedTheme} transparencyEnabled={transparencyEnabled} />

      <SettingRow
        icon={<Palette className="h-5 w-5 text-win-text-secondary" />}
        title={copy.modeTitle}
        action={
          <SegmentedControl<AppTheme>
            value={theme}
            options={copy.modeOptions}
            onChange={setTheme}
          />
        }
      />

      <SettingRow
        icon={<Sparkles className="h-5 w-5 text-win-text-secondary" />}
        title={copy.transparencyTitle}
        action={<ToggleSwitch checked={transparencyEnabled} onChange={setTransparencyEnabled} />}
      />

      <SettingRow
        icon={<Wand2 className="h-5 w-5 text-win-text-secondary" />}
        title={copy.accentModeTitle}
        action={
          <SegmentedControl<AccentMode>
            value={accentMode}
            options={copy.accentModeOptions}
            onChange={setAccentMode}
          />
        }
      />

      <div className="rounded-lg border border-win-border bg-win-card p-4 shadow-sm">
        <div className="mb-4 text-sm font-medium text-win-text">{copy.recentColorsTitle}</div>
        <AccentPalette colors={recentColors} value={accentColor} onChange={setAccentColor} />

        {accentMode === 'manual' ? (
          <div className="mt-5 border-t border-win-border pt-4">
            <div className="mb-3 text-sm font-medium text-win-text">{copy.paletteTitle}</div>
            <AccentPalette colors={ACCENT_SWATCHES} value={accentColor} onChange={setAccentColor} />
            <div className="mt-4 flex items-center justify-between rounded-lg border border-win-border bg-win-bg-secondary px-3 py-3">
              <span className="text-sm text-win-text">{copy.customColorTitle}</span>
              <button
                type="button"
                onClick={() => colorInputRef.current?.click()}
                className="rounded-md border border-win-border-strong bg-win-card px-3 py-1.5 text-sm text-win-text transition-colors hover:bg-win-hover"
              >
                {accentColor.toUpperCase()}
              </button>
            </div>
            <input
              ref={colorInputRef}
              type="color"
              value={accentColor}
              className="sr-only"
              onChange={(event) => setAccentColor(event.target.value)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GeneralPanel() {
  const { locale, setLocale } = useI18n();
  const fontFamily = usePreferencesStore((state) => state.fontFamily);
  const setFontFamily = usePreferencesStore((state) => state.setFontFamily);
  const fontSize = usePreferencesStore((state) => state.fontSize);
  const setFontSize = usePreferencesStore((state) => state.setFontSize);
  const copy =
    locale === 'zh'
      ? {
          languageTitle: '\u8bed\u8a00',
          fontTitle: '\u5b57\u4f53',
          fontSizeTitle: '\u5b57\u53f7',
          languageOptions: [
            { label: 'English', value: 'en' },
            { label: '\u4e2d\u6587', value: 'zh' },
          ] as const satisfies SelectOption<LocaleValue>[],
          fontOptions: [
            { label: '\u9ed8\u8ba4', value: 'system' },
            { label: 'Segoe UI', value: 'segoe' },
            { label: 'Noto Sans SC', value: 'noto' },
          ] as const satisfies SelectOption<AppFontFamily>[],
        }
      : {
          languageTitle: 'Language',
          fontTitle: 'Font',
          fontSizeTitle: 'Size',
          languageOptions: [
            { label: 'English', value: 'en' },
            { label: 'Chinese', value: 'zh' },
          ] as const satisfies SelectOption<LocaleValue>[],
          fontOptions: [
            { label: 'Default', value: 'system' },
            { label: 'Segoe UI', value: 'segoe' },
            { label: 'Noto Sans SC', value: 'noto' },
          ] as const satisfies SelectOption<AppFontFamily>[],
        };
  const fontSizeOptions = APP_FONT_SIZES.map((value) => ({
    label: `${value}px`,
    value,
  })) as SelectOption<AppFontSize>[];

  return (
    <div className="flex flex-col gap-2">
      <SettingRow
        icon={<Languages className="h-5 w-5 text-win-text-secondary" />}
        title={copy.languageTitle}
        action={
          <WinSelect<LocaleValue>
            value={locale}
            options={copy.languageOptions}
            onChange={setLocale}
          />
        }
      />
      <SettingRow
        icon={<Type className="h-5 w-5 text-win-text-secondary" />}
        title={copy.fontTitle}
        action={
          <WinSelect<AppFontFamily>
            value={fontFamily}
            options={copy.fontOptions}
            onChange={setFontFamily}
          />
        }
      />
      <SettingRow
        icon={<Type className="h-5 w-5 text-win-text-secondary" />}
        title={copy.fontSizeTitle}
        action={
          <WinSelect<AppFontSize>
            value={fontSize}
            options={fontSizeOptions}
            onChange={setFontSize}
          />
        }
      />
    </div>
  );
}

function DataPanel() {
  const { t, locale } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [syncAction, setSyncAction] = useState<'idle' | 'testing' | 'uploading' | 'downloading'>(
    'idle',
  );

  const webdavEndpoint = usePreferencesStore((state) => state.webdavEndpoint);
  const setWebDavEndpoint = usePreferencesStore((state) => state.setWebDavEndpoint);
  const webdavUsername = usePreferencesStore((state) => state.webdavUsername);
  const setWebDavUsername = usePreferencesStore((state) => state.setWebDavUsername);
  const webdavPassword = usePreferencesStore((state) => state.webdavPassword);
  const setWebDavPassword = usePreferencesStore((state) => state.setWebDavPassword);
  const webdavRemoteFilePath = usePreferencesStore((state) => state.webdavRemoteFilePath);
  const setWebDavRemoteFilePath = usePreferencesStore((state) => state.setWebDavRemoteFilePath);
  const webdavLastSyncedAt = usePreferencesStore((state) => state.webdavLastSyncedAt);

  const copy =
    locale === 'zh'
      ? {
          localTitle: '\u672c\u5730\u6570\u636e',
          syncTitle: 'WebDAV',
          endpointLabel: '\u5730\u5740',
          usernameLabel: '\u8d26\u53f7',
          passwordLabel: '\u5e94\u7528\u5bc6\u7801',
          remoteFileLabel: '\u8fdc\u7a0b\u6587\u4ef6',
          testConnection: '\u6d4b\u8bd5\u8fde\u63a5',
          uploadNow: '\u4e0a\u4f20',
          downloadNow: '\u4e0b\u8f7d',
          syncIdle: '\u672a\u8fde\u63a5',
          syncSuccess: '\u5df2\u5c31\u7eea',
          syncTesting: '\u6d4b\u8bd5\u4e2d',
          syncUploading: '\u4e0a\u4f20\u4e2d',
          syncDownloading: '\u4e0b\u8f7d\u4e2d',
          syncTestSuccess: 'WebDAV \u8fde\u63a5\u6210\u529f',
          syncUploadSuccess: '\u5df2\u4e0a\u4f20\u5230 WebDAV',
          syncDownloadSuccess: '\u5df2\u4ece WebDAV \u540c\u6b65',
          lastSyncedLabel: '\u4e0a\u6b21\u540c\u6b65',
          notSyncedYet: '\u5c1a\u672a\u540c\u6b65',
          exportTitle: '\u5bfc\u51fa\u5de5\u4f5c\u533a',
          importTitle: '\u5bfc\u5165\u5de5\u4f5c\u533a',
        }
      : {
          localTitle: 'Local data',
          syncTitle: 'WebDAV',
          endpointLabel: 'Endpoint',
          usernameLabel: 'Username',
          passwordLabel: 'App password',
          remoteFileLabel: 'Remote file',
          testConnection: 'Test',
          uploadNow: 'Upload',
          downloadNow: 'Download',
          syncIdle: 'Idle',
          syncSuccess: 'Ready',
          syncTesting: 'Testing',
          syncUploading: 'Uploading',
          syncDownloading: 'Downloading',
          syncTestSuccess: 'WebDAV connected',
          syncUploadSuccess: 'Uploaded to WebDAV',
          syncDownloadSuccess: 'Downloaded from WebDAV',
          lastSyncedLabel: 'Last synced',
          notSyncedYet: 'Not synced yet',
          exportTitle: 'Export workspace',
          importTitle: 'Import workspace',
        };

  const handleExport = () => {
    exportWorkspace(t('dock.exportFilePrefix'));
    toast.success(t('toast.dataExported'));
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      await importWorkspace(file);
      toast.success(t('toast.dataImported'));
    } catch {
      toast.error(t('toast.importFailed'));
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const runSyncAction = async (
    nextAction: Exclude<typeof syncAction, 'idle'>,
    runner: () => Promise<void>,
    successMessage: string,
  ) => {
    setSyncAction(nextAction);

    try {
      await runner();
      toast.success(successMessage);
    } catch (error) {
      toast.error(safeSyncErrorMessage(error));
    } finally {
      setSyncAction('idle');
    }
  };

  const currentSyncStatus =
    syncAction === 'testing'
      ? copy.syncTesting
      : syncAction === 'uploading'
        ? copy.syncUploading
        : syncAction === 'downloading'
          ? copy.syncDownloading
          : webdavLastSyncedAt
            ? copy.syncSuccess
            : copy.syncIdle;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-win-border bg-win-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Cloud className="h-5 w-5 text-win-text-secondary" />
            <h3 className="text-sm font-medium text-win-text">{copy.syncTitle}</h3>
          </div>
          <div className="rounded-full bg-win-bg-secondary px-3 py-1 text-xs text-win-text-secondary">
            {currentSyncStatus}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-win-text-secondary">{copy.endpointLabel}</span>
            <input
              value={webdavEndpoint}
              onChange={(event) => setWebDavEndpoint(event.target.value)}
              className="kb-add-input rounded-lg px-3 py-2 text-sm outline-none"
              placeholder="https://dav.jianguoyun.com/dav/"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-win-text-secondary">{copy.remoteFileLabel}</span>
            <input
              value={webdavRemoteFilePath}
              onChange={(event) => setWebDavRemoteFilePath(event.target.value)}
              className="kb-add-input rounded-lg px-3 py-2 text-sm outline-none"
              placeholder="KhaosBox/khaosbox-sync.json"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-win-text-secondary">{copy.usernameLabel}</span>
            <input
              value={webdavUsername}
              onChange={(event) => setWebDavUsername(event.target.value)}
              className="kb-add-input rounded-lg px-3 py-2 text-sm outline-none"
              placeholder="user@example.com"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-win-text-secondary">{copy.passwordLabel}</span>
            <input
              type="password"
              value={webdavPassword}
              onChange={(event) => setWebDavPassword(event.target.value)}
              className="kb-add-input rounded-lg px-3 py-2 text-sm outline-none"
              placeholder="******"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void runSyncAction(
                'testing',
                async () => {
                  await testWebDavConnection(buildCurrentWebDavConfig());
                },
                copy.syncTestSuccess,
              )
            }
            className="kb-secondary-button rounded-lg border border-win-border px-3 py-2 text-sm transition-colors"
          >
            {copy.testConnection}
          </button>
          <button
            type="button"
            onClick={() =>
              void runSyncAction(
                'uploading',
                async () => {
                  await uploadWorkspaceToWebDav(buildCurrentWebDavConfig());
                },
                copy.syncUploadSuccess,
              )
            }
            className="kb-primary-button rounded-lg px-3 py-2 text-sm transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <CloudUpload className="h-4 w-4" />
              {copy.uploadNow}
            </span>
          </button>
          <button
            type="button"
            onClick={() =>
              void runSyncAction(
                'downloading',
                async () => {
                  await downloadWorkspaceFromWebDav(buildCurrentWebDavConfig());
                },
                copy.syncDownloadSuccess,
              )
            }
            className="kb-secondary-button rounded-lg border border-win-border px-3 py-2 text-sm transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <CloudDownload className="h-4 w-4" />
              {copy.downloadNow}
            </span>
          </button>
        </div>

        <div className="mt-4 text-xs text-win-text-secondary">
          {copy.lastSyncedLabel}: {webdavLastSyncedAt ?? copy.notSyncedYet}
        </div>
      </div>

      <div className="rounded-lg border border-win-border bg-win-card p-5 shadow-sm">
        <div className="mb-4 text-sm font-medium text-win-text">{copy.localTitle}</div>
        <div className="flex flex-col rounded-lg border border-win-border bg-win-card shadow-sm">
          <ActionRow
            icon={<Download className="h-5 w-5 text-win-text-secondary" />}
            title={copy.exportTitle}
            onClick={handleExport}
            roundedClassName="rounded-t-lg"
          />
          <div className="mx-4 h-px bg-win-border" />
          <ActionRow
            icon={<Upload className="h-5 w-5 text-win-text-secondary" />}
            title={copy.importTitle}
            onClick={() => fileInputRef.current?.click()}
            roundedClassName="rounded-b-lg"
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImport}
      />
    </div>
  );
}

function PlaceholderPanel() {
  return (
    <div className="flex flex-col gap-6">
      <div className="min-h-[140px] rounded-lg border border-win-border bg-win-card shadow-sm" />
    </div>
  );
}

function AboutStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-win-border bg-win-bg-secondary px-4 py-3">
      <div className="text-xs uppercase tracking-[0.14em] text-win-text-secondary">{label}</div>
      <div className="mt-2 text-lg font-semibold text-win-text">{value}</div>
    </div>
  );
}

function AboutPanel() {
  const { locale, t } = useI18n();
  const currentTheme = usePreferencesStore((state) => state.theme);
  const currentFontFamily = usePreferencesStore((state) => state.fontFamily);
  const currentFontSize = usePreferencesStore((state) => state.fontSize);

  const copy =
    locale === 'zh'
      ? {
          versionLabel: '\u7248\u672c',
          licenseLabel: '\u8bb8\u53ef',
          schemaLabel: '\u67b6\u6784',
          fontLabel: '\u5b57\u4f53',
          sizeLabel: '\u5b57\u53f7',
          themeLabel: '\u4e3b\u9898',
          themeValues: {
            system: '\u8ddf\u968f\u7cfb\u7edf',
            dark: '\u6df1\u8272',
            light: '\u6d45\u8272',
          } as const,
          fontValues: {
            system: '\u9ed8\u8ba4',
            segoe: 'Segoe UI',
            noto: 'Noto Sans SC',
          } as const,
        }
      : {
          versionLabel: 'Version',
          licenseLabel: 'License',
          schemaLabel: 'Schema',
          fontLabel: 'Font',
          sizeLabel: 'Size',
          themeLabel: 'Theme',
          themeValues: {
            system: 'System',
            dark: 'Dark',
            light: 'Light',
          } as const,
          fontValues: {
            system: 'Default',
            segoe: 'Segoe UI',
            noto: 'Noto Sans SC',
          } as const,
        };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-win-border bg-win-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-win-text">{t('app.brand')}</div>
          </div>
          <div className="rounded-full border border-win-border bg-win-bg-secondary px-3 py-1 text-sm font-medium text-win-text">
            v{__APP_VERSION__}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <AboutStat label={copy.versionLabel} value={`v${__APP_VERSION__}`} />
          <AboutStat label={copy.licenseLabel} value={__APP_LICENSE__} />
          <AboutStat label={copy.schemaLabel} value={`v${WORKSPACE_SCHEMA_VERSION}`} />
          <AboutStat label={copy.themeLabel} value={copy.themeValues[currentTheme]} />
          <AboutStat label={copy.fontLabel} value={copy.fontValues[currentFontFamily]} />
          <AboutStat label={copy.sizeLabel} value={`${currentFontSize}px`} />
        </div>
      </div>
    </div>
  );
}

function SettingsContent({ activeTab }: { activeTab: SettingsTab }) {
  if (activeTab === 'general') {
    return <GeneralPanel />;
  }

  if (activeTab === 'theme') {
    return <ThemePanel />;
  }

  if (activeTab === 'data') {
    return <DataPanel />;
  }

  if (activeTab === 'about') {
    return <AboutPanel />;
  }

  return <PlaceholderPanel />;
}

export default function SettingsPanel() {
  const isOpen = useSettingsPanelStore((state) => state.isOpen);
  const close = useSettingsPanelStore((state) => state.close);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const { t, locale } = useI18n();

  const tabs = [
    { id: 'general' as const, label: t('settings.general'), icon: Settings },
    { id: 'theme' as const, label: t('settings.theme'), icon: Palette },
    { id: 'data' as const, label: locale === 'zh' ? '\u6570\u636e' : 'Data', icon: Database },
    { id: 'about' as const, label: t('settings.about'), icon: Info },
  ];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveTab('general');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close, isOpen]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[99998] bg-black/10 backdrop-blur-[1px]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-[99999] flex h-[min(640px,90vh)] w-[min(900px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl shadow-win-flyout"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="win-mica flex h-full w-full overflow-hidden rounded-xl">
              <div className="relative flex w-72 flex-col px-3 pb-4 pt-10">
                <div className="mb-6 px-3">
                  <h2 className="mb-1 text-2xl font-semibold text-win-text">
                    {t('settings.title')}
                  </h2>
                </div>

                <div className="flex flex-col gap-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          'relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                          isActive ? 'bg-win-active' : 'hover:bg-win-hover',
                        )}
                      >
                        {isActive ? (
                          <motion.div
                            layoutId="settings-active-tab"
                            className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-win-accent"
                          />
                        ) : null}
                        <Icon
                          className={cn(
                            'h-4 w-4',
                            isActive ? 'text-win-text' : 'text-win-text-secondary',
                          )}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                        <span className={isActive ? 'font-medium text-win-text' : 'text-win-text'}>
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="relative flex flex-1 flex-col">
                <button
                  type="button"
                  onClick={close}
                  title={t('settings.close')}
                  aria-label={t('settings.close')}
                  className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-win-text-secondary transition-colors hover:bg-[#E81123] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex-1 overflow-y-auto p-10">
                  <div className="mx-auto max-w-2xl">
                    <h1 className="mb-8 text-3xl font-semibold text-win-text">
                      {tabs.find((tab) => tab.id === activeTab)?.label ?? t('settings.general')}
                    </h1>
                    <SettingsContent activeTab={activeTab} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
