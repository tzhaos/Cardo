/**
 * Ensure preferences theme columns exist after forward migrations.
 *
 * Some installs stayed at PRAGMA user_version=5 while shipping Theme Pack code
 * that expects schema 9 columns. If a step was skipped or an older Runtime held
 * the DB, reads return undefined fields and Zod fails at query.preferences.
 *
 * Idempotent: only ADD COLUMN when missing. Not dual-read of old formats —
 * after ensure, the current schema is the only shape.
 */

export interface PreferencesColumnEnsureAdapter {
  /** PRAGMA table_info(preferences) column names (snake_case). */
  listPreferenceColumns(): string[];
  exec(sql: string): void;
}

const REQUIRED_PREFERENCE_COLUMNS: ReadonlyArray<{ name: string; ddl: string }> = [
  {
    name: 'font_family',
    ddl: `ALTER TABLE preferences ADD COLUMN font_family text NOT NULL DEFAULT 'default'`,
  },
  {
    name: 'font_scale',
    ddl: `ALTER TABLE preferences ADD COLUMN font_scale text NOT NULL DEFAULT 'md'`,
  },
  {
    name: 'density',
    ddl: `ALTER TABLE preferences ADD COLUMN density text NOT NULL DEFAULT 'comfortable'`,
  },
  {
    name: 'theme_color_overrides',
    ddl: `ALTER TABLE preferences ADD COLUMN theme_color_overrides text NOT NULL DEFAULT '{}'`,
  },
  {
    name: 'theme_option_values',
    ddl: `ALTER TABLE preferences ADD COLUMN theme_option_values text NOT NULL DEFAULT '{}'`,
  },
  {
    name: 'imported_theme_packs',
    ddl: `ALTER TABLE preferences ADD COLUMN imported_theme_packs text NOT NULL DEFAULT '[]'`,
  },
  {
    name: 'feature_flags',
    ddl: `ALTER TABLE preferences ADD COLUMN feature_flags text NOT NULL DEFAULT '{}'`,
  },
  {
    name: 'layout_profile_id',
    ddl: `ALTER TABLE preferences ADD COLUMN layout_profile_id text NOT NULL DEFAULT 'classic'`,
  },
  {
    name: 'css_snippet',
    ddl: `ALTER TABLE preferences ADD COLUMN css_snippet text NOT NULL DEFAULT ''`,
  },
  {
    name: 'css_snippet_enabled',
    ddl: `ALTER TABLE preferences ADD COLUMN css_snippet_enabled integer NOT NULL DEFAULT 0`,
  },
];

export function ensurePreferencesThemeColumns(adapter: PreferencesColumnEnsureAdapter): void {
  const existing = new Set(adapter.listPreferenceColumns());
  if (existing.size === 0) {
    // Table missing — baseline migration owns creation.
    return;
  }
  for (const column of REQUIRED_PREFERENCE_COLUMNS) {
    if (existing.has(column.name)) continue;
    adapter.exec(column.ddl);
  }
}
