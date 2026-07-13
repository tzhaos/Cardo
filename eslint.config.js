import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const typeCheckedTsOnly = tseslint.configs.recommendedTypeChecked.map((config) => ({
  ...config,
  files: ['**/*.{ts,tsx}'],
}));

export default tseslint.config(
  {
    ignores: [
      '.orca/**',
      'artifacts/**',
      'dist/**',
      'node_modules/**',
      'eslint.config.js',
      'scripts/**/*.mjs',
    ],
  },
  eslint.configs.recommended,
  {
    files: ['assets/extension-shell/background.js'],
    languageOptions: {
      globals: {
        btoa: 'readonly',
        chrome: 'readonly',
        fetch: 'readonly',
      },
    },
  },
  ...typeCheckedTsOnly,
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: {
        chrome: 'readonly',
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      'react/prop-types': 'off',
    },
  },
  {
    // Product UI: no Drizzle / schema + only public web/kit (flat config replaces rules).
    files: ['src/web/**/*.{ts,tsx}'],
    ignores: ['src/web/kit/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'drizzle-orm',
              message:
                'Product UI must not import drizzle-orm; use RuntimeClient queries/commands and core contracts.',
            },
            {
              name: '@fluentui/react-icons',
              message: 'Icons are Lucide-only via ThemeIcon / web/kit.',
            },
            {
              name: '@mui/icons-material',
              message: 'Icons are Lucide-only via ThemeIcon / web/kit.',
            },
          ],
          patterns: [
            {
              group: ['**/database/schema', '**/database/schema.*', '**/core/database/schema'],
              message:
                'Product UI must not import database schema; business I/O is Runtime-only via RuntimeClient.',
            },
            {
              group: [
                '**/ui/primitives/**',
                '**/ui/primitives',
                '**/ui/cardo/**',
                '**/ui/cardo',
                '**/ui/icons/**',
                '**/ui/icons',
                '**/kit/internal/**',
                '**/ui/lib/**',
                '**/web/kit/internal/**',
              ],
              message:
                'Import product UI only from web/kit path exports (button, nav-item, icon, …). Do not use kit/internal or retired UI paths.',
            },
          ],
        },
      ],
    },
  },
  {
    // Non-UI product code may hold DB (core/runtime) but still must not import kit internals / retired UI.
    // Do not ban drizzle here — core and runtime are allowed to use it.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/web/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/ui/primitives/**',
                '**/ui/primitives',
                '**/ui/cardo/**',
                '**/ui/cardo',
                '**/ui/icons/**',
                '**/ui/icons',
                '**/kit/internal/**',
                '**/ui/lib/**',
                '**/web/kit/internal/**',
              ],
              message:
                'Import product UI only from web/kit path exports. Do not use kit/internal or retired UI paths.',
            },
          ],
          paths: [
            {
              name: '@fluentui/react-icons',
              message: 'Icons are Lucide-only via ThemeIcon / web/kit.',
            },
            {
              name: '@mui/icons-material',
              message: 'Icons are Lucide-only via ThemeIcon / web/kit.',
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
);
