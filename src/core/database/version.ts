/** PRAGMA user_version / DATABASE_SCHEMA_VERSION. Wild installs historically only had 0 or 3. */
export const DATABASE_SCHEMA_VERSION = 5;

/**
 * Schema version established by drizzle/0000_crazy_obadiah_stane.sql (business tables only).
 * Fresh DBs apply baseline at this version, then forward-migrate to DATABASE_SCHEMA_VERSION.
 */
export const BASELINE_SCHEMA_VERSION = 3;
