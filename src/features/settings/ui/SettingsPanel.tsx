import { useState, useRef, useEffect, type ChangeEvent, type ReactNode } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Info,
  Languages,
  Palette,
  RefreshCw,
  Settings,
  Sparkles,
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
  DEFAULT_DARK_ACCENT_COLOR,
  DEFAULT_LIGHT_ACCENT_COLOR,
  type AccentMode,
  type AppTheme,
  type ResolvedAppTheme,
  resolveAppTheme,
} from '../../../domains/preferences/model/preferences';
import { cn } from '../../../lib/utils';

type SettingsTab = 'general' | 'theme' | 'sync' | 'about';
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
  const [prefersDark, setPrefersDark] = useState(() =>
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
        {isOpen && (
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
                  className="group relative flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition-colors hover:bg-win-hover"
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 h-3/5 w-1 -translate-y-1/2 rounded-r-full bg-win-accent" />
                  )}
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
        )}
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
              isActive ? 'bg-win-active text-win-text' : 'text-win-text-secondary hover:bg-win-hover',
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
  checkedLabel,
  uncheckedLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  checkedLabel: string;
  uncheckedLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3"
    >
      <span className="text-sm text-win-text-secondary">{checked ? checkedLabel : uncheckedLabel}</span>
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
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-win-border bg-win-card p-4 shadow-sm">
      <div className="flex items-center gap-4">
        {icon}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-win-text">{title}</span>
          <span className="text-xs text-win-text-secondary">{description}</span>
        </div>
      </div>
      {action}
    </div>
  );
}

function ActionRow({
  icon,
  title,
  description,
  onClick,
  roundedClassName,
}: {
  icon: ReactNode;
  title: string;
  description: string;
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
        <div className="flex flex-col">
          <span className="text-sm font-medium text-win-text">{title}</span>
          <span className="text-xs text-win-text-secondary">{description}</span>
        </div>
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
          resolvedTheme === 'light' ? 'bg-[#dfe8f3] border-slate-300/70' : '',
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
          previewTitle: '实时预览',
          previewDescription: '在不离开设置的情况下，预览盒子、Dock 和面板的当前主题效果。',
          modeTitle: '模式',
          modeDescription: '决定应用整体使用浅色、深色还是跟随系统。',
          transparencyTitle: '透明效果',
          transparencyDescription: '控制面板与 Dock 是否保留半透明材质。',
          accentModeTitle: '强调色来源',
          accentModeDescription: '自动使用系统风格颜色，或手动指定状态色。',
          recentColorsTitle: '最近使用的颜色',
          paletteTitle: '强调色色板',
          customColorTitle: '自定义颜色',
          manualHint: '强调色只影响指示器、选中态、焦点和拖拽反馈，不影响语义图标颜色。',
          modeOptions: [
            { label: '浅色', value: 'light' },
            { label: '深色', value: 'dark' },
            { label: '跟随系统', value: 'system' },
          ] as const satisfies SegmentedOption<AppTheme>[],
          accentModeOptions: [
            { label: '自动', value: 'auto' },
            { label: '手动', value: 'manual' },
          ] as const satisfies SegmentedOption<AccentMode>[],
          onLabel: '开',
          offLabel: '关',
        }
      : {
          previewTitle: 'Live preview',
          previewDescription:
            'Preview how boxes, the dock, and panels respond before leaving settings.',
          modeTitle: 'Mode',
          modeDescription: 'Choose whether the app uses a light, dark, or system appearance.',
          transparencyTitle: 'Transparency effects',
          transparencyDescription: 'Keep panels and the dock translucent, or switch to solid surfaces.',
          accentModeTitle: 'Accent source',
          accentModeDescription: 'Use the default system-style accent or choose one manually.',
          recentColorsTitle: 'Recent colors',
          paletteTitle: 'Accent palette',
          customColorTitle: 'Custom color',
          manualHint:
            'Accent colors only affect indicators, selection, focus, and drag feedback. Semantic icons keep their own colors.',
          modeOptions: [
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
            { label: 'System', value: 'system' },
          ] as const satisfies SegmentedOption<AppTheme>[],
          accentModeOptions: [
            { label: 'Auto', value: 'auto' },
            { label: 'Manual', value: 'manual' },
          ] as const satisfies SegmentedOption<AccentMode>[],
          onLabel: 'On',
          offLabel: 'Off',
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
      <div className="flex flex-col gap-2">
        <div className="px-1">
          <h3 className="text-sm font-semibold text-win-text">{copy.previewTitle}</h3>
          <p className="mt-1 text-xs leading-relaxed text-win-text-secondary">
            {copy.previewDescription}
          </p>
        </div>
        <ThemePreviewCard
          resolvedTheme={resolvedTheme}
          transparencyEnabled={transparencyEnabled}
        />
      </div>

      <SettingRow
        icon={<Palette className="h-5 w-5 text-win-text-secondary" />}
        title={copy.modeTitle}
        description={copy.modeDescription}
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
        description={copy.transparencyDescription}
        action={
          <ToggleSwitch
            checked={transparencyEnabled}
            onChange={setTransparencyEnabled}
            checkedLabel={copy.onLabel}
            uncheckedLabel={copy.offLabel}
          />
        }
      />

      <SettingRow
        icon={<Wand2 className="h-5 w-5 text-win-text-secondary" />}
        title={copy.accentModeTitle}
        description={copy.accentModeDescription}
        action={
          <SegmentedControl<AccentMode>
            value={accentMode}
            options={copy.accentModeOptions}
            onChange={setAccentMode}
          />
        }
      />

      <div className="rounded-lg border border-win-border bg-win-card p-4 shadow-sm">
        <div className="mb-4">
          <div className="text-sm font-medium text-win-text">{copy.recentColorsTitle}</div>
          <div className="mt-1 text-xs leading-relaxed text-win-text-secondary">
            {copy.manualHint}
          </div>
        </div>
        <AccentPalette colors={recentColors} value={accentColor} onChange={setAccentColor} />

        {accentMode === 'manual' && (
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
        )}
      </div>
    </div>
  );
}

function GeneralPanel() {
  const { t, locale, setLocale } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const copy =
    locale === 'zh'
      ? {
          languageTitle: '\u8bed\u8a00',
          languageDescription: '\u5207\u6362\u5e94\u7528\u663e\u793a\u8bed\u8a00',
          dataManagement: '\u6570\u636e\u7ba1\u7406',
          exportTitle: '\u5bfc\u51fa\u5de5\u4f5c\u533a',
          exportDescription:
            '\u5c06\u5f53\u524d\u5e03\u5c40\u548c\u5185\u5bb9\u4fdd\u5b58\u4e3a JSON \u6587\u4ef6',
          importTitle: '\u5bfc\u5165\u5de5\u4f5c\u533a',
          importDescription:
            '\u4ece JSON \u6587\u4ef6\u6062\u590d\u4f60\u7684\u5e03\u5c40\u548c\u5185\u5bb9',
          languageOptions: [
            { label: 'English', value: 'en' },
            { label: '\u4e2d\u6587', value: 'zh' },
          ] as const satisfies SelectOption<LocaleValue>[],
        }
      : {
          languageTitle: 'Language',
          languageDescription: 'Windows display language',
          dataManagement: 'Data Management',
          exportTitle: 'Export workspace',
          exportDescription: 'Save your current layout and content to a JSON file',
          importTitle: 'Import workspace',
          importDescription: 'Restore your layout and content from a JSON file',
          languageOptions: [
            { label: 'English', value: 'en' },
            { label: 'Chinese', value: 'zh' },
          ] as const satisfies SelectOption<LocaleValue>[],
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

  return (
    <div className="flex flex-col gap-2">
      <SettingRow
        icon={<Languages className="h-5 w-5 text-win-text-secondary" />}
        title={copy.languageTitle}
        description={copy.languageDescription}
        action={
          <WinSelect<LocaleValue>
            value={locale}
            options={copy.languageOptions}
            onChange={setLocale}
          />
        }
      />

      <h2 className="mb-3 mt-8 px-1 text-sm font-semibold text-win-text">
        {copy.dataManagement}
      </h2>
      <div className="flex flex-col rounded-lg border border-win-border bg-win-card shadow-sm">
        <ActionRow
          icon={<Download className="h-5 w-5 text-win-text-secondary" />}
          title={copy.exportTitle}
          description={copy.exportDescription}
          onClick={handleExport}
          roundedClassName="rounded-t-lg"
        />
        <div className="mx-4 h-px bg-win-border" />
        <ActionRow
          icon={<Upload className="h-5 w-5 text-win-text-secondary" />}
          title={copy.importTitle}
          description={copy.importDescription}
          onClick={() => fileInputRef.current?.click()}
          roundedClassName="rounded-b-lg"
        />
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

function PlaceholderPanel({ message }: { message: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-win-border bg-win-card p-6 shadow-sm">
        <p className="text-sm text-win-text-secondary">{message}</p>
      </div>
    </div>
  );
}

function SettingsContent({ activeTab }: { activeTab: SettingsTab }) {
  const { t } = useI18n();

  if (activeTab === 'general') {
    return <GeneralPanel />;
  }

  if (activeTab === 'theme') {
    return <ThemePanel />;
  }

  if (activeTab === 'sync') {
    return <PlaceholderPanel message={t('settings.sync.placeholder')} />;
  }

  return <PlaceholderPanel message={t('settings.about.placeholder')} />;
}

export default function SettingsPanel() {
  const isOpen = useSettingsPanelStore((state) => state.isOpen);
  const close = useSettingsPanelStore((state) => state.close);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const { t } = useI18n();

  const tabs: Array<{ id: SettingsTab; label: string; icon: typeof Settings }> = [
    { id: 'general', label: t('settings.general'), icon: Settings },
    { id: 'theme', label: t('settings.theme'), icon: Palette },
    { id: 'sync', label: t('settings.sync'), icon: RefreshCw },
    { id: 'about', label: t('settings.about'), icon: Info },
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
      {isOpen && (
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
                  <h2 className="mb-1 text-2xl font-semibold text-win-text">{t('settings.title')}</h2>
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
                        {isActive && (
                          <motion.div
                            layoutId="settings-active-tab"
                            className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-win-accent"
                          />
                        )}
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
      )}
    </AnimatePresence>
  );
}
