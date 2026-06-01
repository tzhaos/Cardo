import { Palette, Sparkles, Wand2 } from 'lucide-react';
import type {
  AccentMode,
  AppTheme,
  ResolvedAppTheme,
} from '../../../../core/domains/preferences/model/preferences';
import { cn } from '../../../lib/utils';
import { useThemeSettings } from '../hooks/useThemeSettings';
import { AccentPalette, SegmentedControl, SettingRow, ToggleSwitch } from './SettingsControls';

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

export function ThemePanel() {
  const settings = useThemeSettings();
  const { copy } = settings;

  return (
    <div className="flex flex-col gap-4">
      <div className="px-1 text-sm font-semibold text-win-text">{copy.previewTitle}</div>
      <ThemePreviewCard
        resolvedTheme={settings.resolvedTheme}
        transparencyEnabled={settings.transparencyEnabled}
      />

      <SettingRow
        icon={<Palette className="h-5 w-5 text-win-text-secondary" />}
        title={copy.modeTitle}
        action={
          <SegmentedControl<AppTheme>
            value={settings.theme}
            options={copy.modeOptions}
            onChange={settings.setTheme}
          />
        }
      />

      <SettingRow
        icon={<Sparkles className="h-5 w-5 text-win-text-secondary" />}
        title={copy.transparencyTitle}
        action={
          <ToggleSwitch
            checked={settings.transparencyEnabled}
            onChange={settings.setTransparencyEnabled}
          />
        }
      />

      <SettingRow
        icon={<Wand2 className="h-5 w-5 text-win-text-secondary" />}
        title={copy.accentModeTitle}
        action={
          <SegmentedControl<AccentMode>
            value={settings.accentMode}
            options={copy.accentModeOptions}
            onChange={settings.setAccentMode}
          />
        }
      />

      <div className="rounded-lg border border-win-border bg-win-card p-4 shadow-sm">
        <div className="mb-4 text-sm font-medium text-win-text">{copy.recentColorsTitle}</div>
        <AccentPalette
          colors={settings.recentColors}
          value={settings.accentColor}
          onChange={settings.setAccentColor}
        />

        {settings.accentMode === 'manual' ? (
          <div className="mt-5 border-t border-win-border pt-4">
            <div className="mb-3 text-sm font-medium text-win-text">{copy.paletteTitle}</div>
            <AccentPalette
              colors={settings.accentSwatches}
              value={settings.accentColor}
              onChange={settings.setAccentColor}
            />
            <div className="mt-4 flex items-center justify-between rounded-lg border border-win-border bg-win-bg-secondary px-3 py-3">
              <span className="text-sm text-win-text">{copy.customColorTitle}</span>
              <button
                type="button"
                onClick={() => settings.colorInputRef.current?.click()}
                className="rounded-md border border-win-border-strong bg-win-card px-3 py-1.5 text-sm text-win-text transition-colors hover:bg-win-hover"
              >
                {settings.accentColor.toUpperCase()}
              </button>
            </div>
            <input
              ref={settings.colorInputRef}
              type="color"
              value={settings.accentColor}
              className="sr-only"
              onChange={(event) => settings.setAccentColor(event.target.value)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
