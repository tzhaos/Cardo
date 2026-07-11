import type { ThemeOptionDef } from '../../core/contracts/themePack';

/**
 * Shared options for official packs.
 *
 * Identity rule: every option's default choice must apply zero token patches so
 * the current product look (classic and other official packs as authored) is unchanged
 * until the user deliberately picks a non-default option.
 */
export const OFFICIAL_THEME_OPTIONS: ThemeOptionDef[] = [
  {
    id: 'chrome.surface',
    type: 'select',
    label: { en: 'Chrome surface', zh: '壳层表面' },
    description: {
      en: 'Glass matches the current product chrome. Solid is an optional alternate.',
      zh: '玻璃为当前产品默认壳层；实心为可选变体。',
    },
    default: 'glass',
    choices: [
      {
        id: 'glass',
        label: { en: 'Glass (official)', zh: '玻璃（官方）' },
        // No tokens — identity default for current design.
      },
      {
        id: 'solid',
        label: { en: 'Solid', zh: '实心' },
        tokens: {
          chrome: { blur: '0px' },
          colors: {
            light: {
              surface: 'rgba(255, 255, 255, 0.98)',
              surfaceStrong: '#ffffff',
              panelChrome: 'rgba(255, 255, 255, 0.94)',
              panelContent: 'rgba(255, 255, 255, 0.88)',
            },
            dark: {
              surface: 'rgba(42, 42, 43, 0.98)',
              surfaceStrong: '#2a2a2b',
              panelChrome: 'rgba(34, 34, 35, 0.96)',
              panelContent: 'rgba(28, 28, 29, 0.92)',
            },
          },
        },
      },
    ],
  },
  {
    id: 'corners',
    type: 'select',
    label: { en: 'Corners', zh: '圆角' },
    description: {
      en: 'Default matches the official radius scale used by the product shell.',
      zh: '默认与当前产品圆角尺度一致。',
    },
    default: 'default',
    choices: [
      {
        id: 'default',
        label: { en: 'Default (official)', zh: '默认（官方）' },
      },
      {
        id: 'soft',
        label: { en: 'Soft', zh: '柔和' },
        tokens: {
          radii: {
            xs: '6px',
            sm: '8px',
            md: '12px',
            lg: '16px',
            xl: '20px',
            pill: '999px',
          },
        },
      },
      {
        id: 'sharp',
        label: { en: 'Sharp', zh: '硬朗' },
        tokens: {
          radii: {
            xs: '2px',
            sm: '3px',
            md: '5px',
            lg: '7px',
            xl: '10px',
            pill: '999px',
          },
        },
      },
    ],
  },
];
