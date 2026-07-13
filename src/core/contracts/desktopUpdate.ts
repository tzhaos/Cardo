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

/** How this Desktop binary was distributed (drives asset pick + apply strategy). */
export const desktopInstallChannelSchema = z.enum(['setup', 'portable', 'dev']);
export type DesktopInstallChannel = z.infer<typeof desktopInstallChannelSchema>;

export const desktopUpdateAssetKindSchema = z.enum(['setup', 'portable']);
export type DesktopUpdateAssetKind = z.infer<typeof desktopUpdateAssetKindSchema>;

export const desktopUpdateAvailableInfoSchema = z
  .object({
    version: z.string().regex(PRODUCT_SEMVER_RE),
    tag: z.string().min(1),
    releaseUrl: z.string().url(),
    notes: z.string(),
    publishedAt: z.string().nullable(),
    /** Which Release asset was selected for this install channel. */
    assetKind: desktopUpdateAssetKindSchema,
    installerName: z.string().min(1),
    installerUrl: z.string().url(),
    installerSizeBytes: z.number().int().nonnegative().nullable(),
    // Stable channel requires a checksum; fetch fails closed without SHA256SUMS entry.
    sha256: z.string().regex(/^[a-f0-9]{64}$/i),
    /**
     * From release notes: Cardo-Min-Client: X.Y.Z
     * Client must be at least this version (else forceUpdate).
     */
    minClientVersion: z.string().regex(PRODUCT_SEMVER_RE).nullable().optional(),
    /** From release notes: Cardo-Force-Update: true */
    forceUpdateFromNotes: z.boolean().optional(),
  })
  .strict();

export type DesktopUpdateAvailableInfo = z.infer<typeof desktopUpdateAvailableInfoSchema>;

export const desktopUpdateStateSchema = z
  .object({
    phase: desktopUpdatePhaseSchema,
    currentVersion: z.string().min(1),
    channel: z.literal('github-stable'),
    /** Local install shape: setup | portable | dev. */
    installChannel: desktopInstallChannelSchema,
    available: desktopUpdateAvailableInfoSchema.nullable(),
    downloadPercent: z.number().min(0).max(100).nullable(),
    downloadedBytes: z.number().int().nonnegative().nullable(),
    totalBytes: z.number().int().nonnegative().nullable(),
    installerPath: z.string().nullable(),
    errorMessage: z.string().nullable(),
    checkedAt: z.string().nullable(),
    autoCheckEnabled: z.boolean(),
    isPackaged: z.boolean(),
    /**
     * True when this client must install the available update
     * (min client floor or explicit force flag on the release).
     */
    forceUpdate: z.boolean(),
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
