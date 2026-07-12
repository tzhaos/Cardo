import type { ReactNode } from 'react';

/**
 * Fluent settings nav — Win11 Settings sidebar language.
 *
 * Real Win11 Settings uses colorful filled category icons (not monochrome
 * Fluent System line icons). At 20px that means:
 * - one primary hue per glyph
 * - solid fills (at most one soft 2-stop gradient)
 * - rounded geometry on a tight pixel grid
 * - no multi-layer opacity stacks (those look muddy small)
 *
 * Classic theme does not use these; it keeps monochrome Lucide.
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

/** General — Options / toggles (Win11 System-adjacent blue). */
export function SettingsNavGeneralIcon() {
  return (
    <NavSvg className="cardo-settings-nav-glyph cardo-settings-nav-glyph-general">
      {/* tracks */}
      <rect x="2" y="3" width="16" height="3.5" rx="1.75" fill="#60CDFF" />
      <rect x="2" y="8.25" width="16" height="3.5" rx="1.75" fill="#0078D4" />
      <rect x="2" y="13.5" width="16" height="3.5" rx="1.75" fill="#005FB8" />
      {/* thumbs — solid + thin light ring for Win11 toggle look */}
      <circle cx="13.5" cy="4.75" r="2.35" fill="#0F6CBD" />
      <circle cx="13.5" cy="4.75" r="2.35" stroke="#FFFFFF" strokeWidth="1.1" />
      <circle cx="6.5" cy="10" r="2.35" fill="#005A9E" />
      <circle cx="6.5" cy="10" r="2.35" stroke="#FFFFFF" strokeWidth="1.1" />
      <circle cx="14" cy="15.25" r="2.35" fill="#004578" />
      <circle cx="14" cy="15.25" r="2.35" stroke="#FFFFFF" strokeWidth="1.1" />
    </NavSvg>
  );
}

/**
 * Appearance — Personalization.
 * Rounded color well + four solid chips (Win11 theme tiles language).
 */
export function SettingsNavAppearanceIcon() {
  return (
    <NavSvg className="cardo-settings-nav-glyph cardo-settings-nav-glyph-appearance">
      <rect x="1.5" y="1.5" width="17" height="17" rx="4" fill="#F3F3F3" />
      <rect x="1.5" y="1.5" width="17" height="17" rx="4" stroke="#E0E0E0" strokeWidth="1" />
      {/* 2×2 solid accent tiles */}
      <rect x="3.5" y="3.5" width="5.5" height="5.5" rx="1.25" fill="#0078D4" />
      <rect x="11" y="3.5" width="5.5" height="5.5" rx="1.25" fill="#8764B8" />
      <rect x="3.5" y="11" width="5.5" height="5.5" rx="1.25" fill="#0F7B0F" />
      <rect x="11" y="11" width="5.5" height="5.5" rx="1.25" fill="#CA5010" />
    </NavSvg>
  );
}

/**
 * Data — Storage / disk stack.
 * Two solid green disks; no translucent mid-ellipses (those blur at 20px).
 */
export function SettingsNavDataIcon() {
  return (
    <NavSvg className="cardo-settings-nav-glyph cardo-settings-nav-glyph-data">
      {/* back disk */}
      <ellipse cx="10" cy="5.5" rx="7" ry="2.6" fill="#6CCB5F" />
      <path d="M3 5.5v4.2c0 1.45 3.13 2.6 7 2.6s7-1.15 7-2.6V5.5" fill="#0F7B0F" />
      <ellipse cx="10" cy="9.7" rx="7" ry="2.6" fill="#107C10" />
      {/* front disk */}
      <path d="M3 9.7v4.3c0 1.45 3.13 2.6 7 2.6s7-1.15 7-2.6V9.7" fill="#0B6A0B" />
      <ellipse cx="10" cy="14" rx="7" ry="2.6" fill="#107C10" />
      <ellipse cx="10" cy="14" rx="7" ry="2.6" fill="#6CCB5F" opacity="0.35" />
    </NavSvg>
  );
}

/**
 * About — Info badge (Win11 accent blue + white glyph).
 * Flat filled circle reads cleanest at 20px.
 */
export function SettingsNavAboutIcon() {
  return (
    <NavSvg className="cardo-settings-nav-glyph cardo-settings-nav-glyph-about">
      <circle cx="10" cy="10" r="8" fill="#0078D4" />
      <circle cx="10" cy="6.4" r="1.25" fill="#FFFFFF" />
      <rect x="8.85" y="8.7" width="2.3" height="6.1" rx="1.15" fill="#FFFFFF" />
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
