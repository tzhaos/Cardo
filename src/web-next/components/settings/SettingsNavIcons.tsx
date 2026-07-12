import { useId, type ReactNode } from 'react';

/**
 * Multi-color Fluent-style glyphs for settings nav.
 * Layered fills (not monochrome strokes) to match Win11 Settings icon language.
 */

function NavSvg({ children, className }: { children: ReactNode; className: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      focusable="false"
      shapeRendering="geometricPrecision"
    >
      {children}
    </svg>
  );
}

export function SettingsNavGeneralIcon() {
  const uid = useId().replace(/:/g, '');
  const a = `cardo-nav-general-a-${uid}`;
  const b = `cardo-nav-general-b-${uid}`;
  const c = `cardo-nav-general-c-${uid}`;

  return (
    <NavSvg className="cardo-settings-nav-glyph cardo-settings-nav-glyph-general">
      <rect x="2.5" y="3.5" width="15" height="3.2" rx="1.6" fill={`url(#${a})`} />
      <circle cx="12.5" cy="5.1" r="2.15" fill="#0f6cbd" stroke="#fff" strokeWidth="1" />
      <rect x="2.5" y="8.4" width="15" height="3.2" rx="1.6" fill={`url(#${b})`} />
      <circle cx="7.2" cy="10" r="2.15" fill="#0078d4" stroke="#fff" strokeWidth="1" />
      <rect x="2.5" y="13.3" width="15" height="3.2" rx="1.6" fill={`url(#${c})`} />
      <circle cx="13.8" cy="14.9" r="2.15" fill="#005a9e" stroke="#fff" strokeWidth="1" />
      <defs>
        <linearGradient id={a} x1="2.5" y1="3.5" x2="17.5" y2="6.7">
          <stop stopColor="#60cdff" />
          <stop offset="1" stopColor="#0078d4" />
        </linearGradient>
        <linearGradient id={b} x1="2.5" y1="8.4" x2="17.5" y2="11.6">
          <stop stopColor="#4cc2ff" />
          <stop offset="1" stopColor="#0f6cbd" />
        </linearGradient>
        <linearGradient id={c} x1="2.5" y1="13.3" x2="17.5" y2="16.5">
          <stop stopColor="#3aa0fe" />
          <stop offset="1" stopColor="#005fb8" />
        </linearGradient>
      </defs>
    </NavSvg>
  );
}

export function SettingsNavAppearanceIcon() {
  const uid = useId().replace(/:/g, '');
  const plate = `cardo-nav-appearance-plate-${uid}`;
  const tip = `cardo-nav-appearance-tip-${uid}`;

  return (
    <NavSvg className="cardo-settings-nav-glyph cardo-settings-nav-glyph-appearance">
      <path
        d="M10 2.2c-4.2 0-7.6 3.1-7.6 7 0 2.7 1.5 4.2 3.1 4.2.9 0 1.4-.5 2.1-.5.8 0 1.3.6 2.4.6 3.4 0 5.6-2.7 5.6-5.8C15.6 4.6 13.3 2.2 10 2.2Z"
        fill={`url(#${plate})`}
      />
      <circle cx="7.1" cy="7.2" r="1.55" fill="#ff6b6b" />
      <circle cx="10.5" cy="5.9" r="1.55" fill="#ffd43b" />
      <circle cx="13.1" cy="8.1" r="1.55" fill="#51cf66" />
      <circle cx="8.4" cy="10.6" r="1.55" fill="#339af0" />
      <circle cx="11.7" cy="10.5" r="1.55" fill="#b197fc" />
      <path
        d="M11.6 14.2c.3 1.7 1.4 3.1 3.1 3.6.4.1.8-.2.8-.6v-1.7c0-1.5-1.2-2.7-2.7-2.7-.5 0-1 .2-1.4.5-.3.3-.3.8.2.9Z"
        fill={`url(#${tip})`}
      />
      <defs>
        <linearGradient id={plate} x1="2.4" y1="2.2" x2="15.6" y2="13.4">
          <stop stopColor="#f3f0ff" />
          <stop offset="1" stopColor="#e5dbff" />
        </linearGradient>
        <linearGradient id={tip} x1="11.2" y1="13.3" x2="15.5" y2="17.8">
          <stop stopColor="#b197fc" />
          <stop offset="1" stopColor="#7048e8" />
        </linearGradient>
      </defs>
    </NavSvg>
  );
}

export function SettingsNavDataIcon() {
  const uid = useId().replace(/:/g, '');
  const top = `cardo-nav-data-top-${uid}`;
  const mid = `cardo-nav-data-mid-${uid}`;
  const low = `cardo-nav-data-low-${uid}`;
  const base = `cardo-nav-data-base-${uid}`;
  const bottom = `cardo-nav-data-bottom-${uid}`;

  return (
    <NavSvg className="cardo-settings-nav-glyph cardo-settings-nav-glyph-data">
      <ellipse cx="10" cy="4.4" rx="6.4" ry="2.2" fill={`url(#${top})`} />
      <path
        d="M3.6 4.4v3.1c0 1.2 2.9 2.2 6.4 2.2s6.4-1 6.4-2.2V4.4"
        fill={`url(#${mid})`}
      />
      <ellipse cx="10" cy="7.5" rx="6.4" ry="2.2" fill="#0b6e4f" opacity="0.22" />
      <path
        d="M3.6 7.5v3.1c0 1.2 2.9 2.2 6.4 2.2s6.4-1 6.4-2.2V7.5"
        fill={`url(#${low})`}
      />
      <ellipse cx="10" cy="10.6" rx="6.4" ry="2.2" fill="#087f5b" opacity="0.2" />
      <path
        d="M3.6 10.6v3.2c0 1.2 2.9 2.2 6.4 2.2s6.4-1 6.4-2.2v-3.2"
        fill={`url(#${base})`}
      />
      <ellipse cx="10" cy="13.8" rx="6.4" ry="2.2" fill={`url(#${bottom})`} />
      <defs>
        <linearGradient id={top} x1="3.6" y1="2.2" x2="16.4" y2="6.6">
          <stop stopColor="#63e6be" />
          <stop offset="1" stopColor="#12b886" />
        </linearGradient>
        <linearGradient id={mid} x1="3.6" y1="4.4" x2="16.4" y2="9.7">
          <stop stopColor="#38d9a9" />
          <stop offset="1" stopColor="#0ca678" />
        </linearGradient>
        <linearGradient id={low} x1="3.6" y1="7.5" x2="16.4" y2="12.8">
          <stop stopColor="#20c997" />
          <stop offset="1" stopColor="#099268" />
        </linearGradient>
        <linearGradient id={base} x1="3.6" y1="10.6" x2="16.4" y2="15.9">
          <stop stopColor="#12b886" />
          <stop offset="1" stopColor="#087f5b" />
        </linearGradient>
        <linearGradient id={bottom} x1="3.6" y1="11.6" x2="16.4" y2="16">
          <stop stopColor="#0ca678" />
          <stop offset="1" stopColor="#066448" />
        </linearGradient>
      </defs>
    </NavSvg>
  );
}

export function SettingsNavAboutIcon() {
  const uid = useId().replace(/:/g, '');
  const ring = `cardo-nav-about-ring-${uid}`;
  const disk = `cardo-nav-about-disk-${uid}`;

  return (
    <NavSvg className="cardo-settings-nav-glyph cardo-settings-nav-glyph-about">
      <circle cx="10" cy="10" r="7.4" fill={`url(#${ring})`} />
      <circle cx="10" cy="10" r="5.7" fill={`url(#${disk})`} />
      <circle cx="10" cy="6.9" r="1.15" fill="#fff" />
      <rect x="8.85" y="9" width="2.3" height="5.1" rx="1.15" fill="#fff" />
      <defs>
        <linearGradient id={ring} x1="2.6" y1="2.6" x2="17.4" y2="17.4">
          <stop stopColor="#ffd8a8" />
          <stop offset="1" stopColor="#fd7e14" />
        </linearGradient>
        <linearGradient id={disk} x1="4.3" y1="4.3" x2="15.7" y2="15.7">
          <stop stopColor="#ffa94d" />
          <stop offset="1" stopColor="#e8590c" />
        </linearGradient>
      </defs>
    </NavSvg>
  );
}

export type SettingsSectionId = 'general' | 'appearance' | 'data' | 'about';

const SETTINGS_NAV_ICONS: Record<SettingsSectionId, () => ReactNode> = {
  general: SettingsNavGeneralIcon,
  appearance: SettingsNavAppearanceIcon,
  data: SettingsNavDataIcon,
  about: SettingsNavAboutIcon,
};

export function SettingsNavIcon({ id }: { id: SettingsSectionId }) {
  const Icon = SETTINGS_NAV_ICONS[id];
  return (
    <span className={`cardo-settings-nav-icon cardo-settings-nav-icon-${id}`} aria-hidden="true">
      <Icon />
    </span>
  );
}
