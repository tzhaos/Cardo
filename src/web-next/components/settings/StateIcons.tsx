import { Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import type { WebNextLocale } from '../../i18n/messages';
import type { WebNextColorMode } from '../../themes/themeRegistry';

export function LanguageStateIcon({ locale }: { locale: WebNextLocale }) {
  const englishPrimary = locale === 'en';

  return (
    <span className="cardo-language-state-icon" aria-hidden="true">
      <motion.span
        className="cardo-language-en"
        animate={{
          x: englishPrimary ? 0 : 12,
          y: englishPrimary ? 0 : 9,
          scale: englishPrimary ? 1.08 : 0.62,
          opacity: englishPrimary ? 1 : 0.42,
        }}
        transition={{ type: 'spring', stiffness: 360, damping: 24 }}
      >
        EN
      </motion.span>
      <motion.span
        className="cardo-language-zh"
        animate={{
          x: englishPrimary ? 13 : 0,
          y: englishPrimary ? 9 : 0,
          scale: englishPrimary ? 0.62 : 1.08,
          opacity: englishPrimary ? 0.42 : 1,
        }}
        transition={{ type: 'spring', stiffness: 360, damping: 24 }}
      >
        文
      </motion.span>
    </span>
  );
}

export function ColorModeStateIcon({ colorMode }: { colorMode: WebNextColorMode }) {
  const lightPrimary = colorMode === 'light';

  return (
    <span className="cardo-theme-state-icon" aria-hidden="true">
      <motion.span
        className="cardo-theme-sun"
        animate={{
          x: lightPrimary ? 0 : 13,
          y: lightPrimary ? 0 : 9,
          rotate: lightPrimary ? 0 : 75,
          scale: lightPrimary ? 1.08 : 0.58,
          opacity: lightPrimary ? 1 : 0.4,
        }}
        transition={{ type: 'spring', stiffness: 330, damping: 23 }}
      >
        <Sun size={15} />
      </motion.span>
      <motion.span
        className="cardo-theme-moon"
        animate={{
          x: lightPrimary ? 13 : 0,
          y: lightPrimary ? 9 : 0,
          rotate: lightPrimary ? -35 : 0,
          scale: lightPrimary ? 0.58 : 1.08,
          opacity: lightPrimary ? 0.4 : 1,
        }}
        transition={{ type: 'spring', stiffness: 330, damping: 23 }}
      >
        <Moon size={15} />
      </motion.span>
    </span>
  );
}
