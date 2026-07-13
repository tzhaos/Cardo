import { DATABASE_SCHEMA_VERSION } from './database/version';

export type RuntimeCompatibilityInput = {
  schemaVersion: number;
  /** if true, require servesAppUi === true when provided */
  requireAppUi?: boolean;
  servesAppUi?: boolean | null;
};

export type RuntimeCompatibilityResult =
  | { ok: true }
  | { ok: false; code: 'schema_mismatch' | 'app_ui_missing'; message: string };

export function assertRuntimeCompatible(
  input: RuntimeCompatibilityInput,
): RuntimeCompatibilityResult {
  if (input.schemaVersion !== DATABASE_SCHEMA_VERSION) {
    return {
      ok: false,
      code: 'schema_mismatch',
      message: `Runtime schemaVersion ${input.schemaVersion} is not compatible with client schema ${DATABASE_SCHEMA_VERSION}. Stop Runtime (cardo stop) and upgrade all surfaces.`,
    };
  }
  if (input.requireAppUi && input.servesAppUi === false) {
    return {
      ok: false,
      code: 'app_ui_missing',
      message:
        'Runtime is healthy but does not serve /app UI. Rebuild web-runtime or reinstall Cardo.',
    };
  }
  return { ok: true };
}
