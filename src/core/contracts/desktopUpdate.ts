import { z } from 'zod';
import { PRODUCT_SEMVER_RE } from '../version/semver';

export const desktopUpdatePhaseSchema = z.enum([
  'idle',
  'checking',
  'upToDate',
  'available',
  'downloading',
  'readyToInstall',
  'installing',
  'error',
  'unsupported',
]);

export type DesktopUpdatePhase = z.infer<typeof desktopUpdatePhaseSchema>;

export const desktopUpdateAvailableInfoSchema = z
  .object({
    version: z.string().regex(PRODUCT_SEMVER_RE),
    tag: z.string().min(1),
    releaseUrl: z.string().url(),
    notes: z.string(),
    publishedAt: z.string().nullable(),
    installerName: z.string().min(1),
    installerUrl: z.string().url(),
    installerSizeBytes: z.number().int().nonnegative().nullable(),
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/i)
      .nullable(),
  })
  .strict();

export type DesktopUpdateAvailableInfo = z.infer<typeof desktopUpdateAvailableInfoSchema>;

export const desktopUpdateStateSchema = z
  .object({
    phase: desktopUpdatePhaseSchema,
    currentVersion: z.string().min(1),
    channel: z.literal('github-stable'),
    available: desktopUpdateAvailableInfoSchema.nullable(),
    downloadPercent: z.number().min(0).max(100).nullable(),
    downloadedBytes: z.number().int().nonnegative().nullable(),
    totalBytes: z.number().int().nonnegative().nullable(),
    installerPath: z.string().nullable(),
    errorMessage: z.string().nullable(),
    checkedAt: z.string().nullable(),
    autoCheckEnabled: z.boolean(),
    isPackaged: z.boolean(),
  })
  .strict();

export type DesktopUpdateState = z.infer<typeof desktopUpdateStateSchema>;

export const desktopUpdateCheckResultSchema = desktopUpdateStateSchema;
export const desktopUpdateDownloadResultSchema = desktopUpdateStateSchema;
export const desktopUpdateInstallResultSchema = z
  .object({
    ok: z.boolean(),
    errorMessage: z.string().nullable(),
  })
  .strict();

export type DesktopUpdateInstallResult = z.infer<typeof desktopUpdateInstallResultSchema>;
