import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { z } from 'zod';
import type {
  DesktopInstallChannel,
  DesktopUpdateAvailableInfo,
  DesktopUpdateAssetKind,
} from '../../core/contracts/desktopUpdate';
import {
  githubLatestReleaseApiUrl,
  githubReleasePageUrl,
  resolveUpdateRepository,
} from '../../core/version/releaseChannel';
import { isNewerProductSemver, normalizeProductSemver } from '../../core/version/semver';
import { parseCardoReleasePolicy } from './releasePolicy';

const githubAssetSchema = z
  .object({
    name: z.string(),
    browser_download_url: z.string().url(),
    size: z.number().int().nonnegative(),
  })
  .passthrough();

const githubReleaseSchema = z
  .object({
    tag_name: z.string(),
    name: z.string().nullable().optional(),
    body: z.string().nullable().optional(),
    draft: z.boolean(),
    prerelease: z.boolean(),
    published_at: z.string().nullable().optional(),
    html_url: z.string().url().optional(),
    assets: z.array(githubAssetSchema),
  })
  .passthrough();

export type GitHubRelease = z.infer<typeof githubReleaseSchema>;

export class UpdateFetchError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'UpdateFetchError';
    this.code = code;
  }
}

function userAgent(currentVersion: string): string {
  return `Cardo-Desktop/${currentVersion} (+https://github.com/tzhaos/Cardo)`;
}

async function githubGetJson(url: string, currentVersion: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': userAgent(currentVersion),
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (response.status === 404) {
    throw new UpdateFetchError('not_found', 'No published GitHub release found.');
  }
  if (!response.ok) {
    throw new UpdateFetchError(
      'http_error',
      `GitHub API ${response.status}: ${response.statusText || 'request failed'}`,
    );
  }
  return (await response.json()) as unknown;
}

function pickSetupAsset(assets: GitHubRelease['assets'], version: string) {
  const preferred = [`Cardo-${version}-Setup-x64.exe`, `Cardo Setup ${version}.exe`];
  for (const name of preferred) {
    const hit = assets.find((asset) => asset.name === name);
    if (hit) return hit;
  }
  return (
    assets.find((asset) => /setup.*\.exe$/i.test(asset.name) && !/portable/i.test(asset.name)) ??
    assets.find((asset) => /\.exe$/i.test(asset.name) && /setup/i.test(asset.name)) ??
    null
  );
}

function pickPortableAsset(assets: GitHubRelease['assets'], version: string) {
  const preferred = [
    `Cardo-${version}-Portable-x64.exe`,
    `Cardo ${version}.exe`,
    `Cardo-${version}-win-x64.exe`,
  ];
  for (const name of preferred) {
    const hit = assets.find((asset) => asset.name === name);
    if (hit) return hit;
  }
  return (
    assets.find((asset) => /portable.*\.exe$/i.test(asset.name)) ??
    assets.find((asset) => /\.exe$/i.test(asset.name) && /portable/i.test(asset.name)) ??
    null
  );
}

function pickAssetForChannel(
  assets: GitHubRelease['assets'],
  version: string,
  installChannel: DesktopInstallChannel,
): { asset: GitHubRelease['assets'][number]; assetKind: DesktopUpdateAssetKind } | null {
  // Portable never falls back to Setup — that would silently migrate install channel.
  if (installChannel === 'portable') {
    const portable = pickPortableAsset(assets, version);
    return portable ? { asset: portable, assetKind: 'portable' } : null;
  }

  // setup (and dev if ever used) only accept Setup assets
  const setup = pickSetupAsset(assets, version);
  if (setup) return { asset: setup, assetKind: 'setup' };
  return null;
}

function pickChecksumAsset(assets: GitHubRelease['assets']) {
  return (
    assets.find((asset) => asset.name === 'SHA256SUMS.txt') ??
    assets.find((asset) => /sha256/i.test(asset.name) && /\.txt$/i.test(asset.name)) ??
    null
  );
}

function parseSha256Sums(text: string, fileName: string): string | null {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const match = /^\s*([a-fA-F0-9]{64})\s+\*?(.+?)\s*$/.exec(line);
    if (!match) continue;
    const hash = match[1];
    const fileField = match[2];
    if (!hash || !fileField) continue;
    const name = path.posix.basename(fileField.replace(/\\/g, '/').trim());
    if (name === fileName || fileField.endsWith(fileName)) {
      return hash.toLowerCase();
    }
  }
  return null;
}

export async function fetchLatestStableUpdate(options: {
  currentVersion: string;
  installChannel: DesktopInstallChannel;
  env?: NodeJS.ProcessEnv;
}): Promise<DesktopUpdateAvailableInfo | null> {
  const { owner, repo } = resolveUpdateRepository(options.env);
  const current = normalizeProductSemver(options.currentVersion);
  if (!current) {
    throw new UpdateFetchError('invalid_current_version', 'Current app version is not X.Y.Z.');
  }

  const raw = await githubGetJson(githubLatestReleaseApiUrl(owner, repo), current);
  const release = githubReleaseSchema.parse(raw);

  if (release.draft || release.prerelease) {
    return null;
  }

  const version = normalizeProductSemver(release.tag_name);
  if (!version) {
    throw new UpdateFetchError(
      'invalid_release_tag',
      `Latest release tag "${release.tag_name}" is not a product semver.`,
    );
  }

  if (!isNewerProductSemver(version, current)) {
    return null;
  }

  const picked = pickAssetForChannel(release.assets, version, options.installChannel);
  if (!picked) {
    throw new UpdateFetchError(
      'missing_installer',
      options.installChannel === 'portable'
        ? `Release v${version} has no Desktop Portable asset.`
        : `Release v${version} has no Desktop Setup installer asset.`,
    );
  }

  const { asset, assetKind } = picked;

  const checksumAsset = pickChecksumAsset(release.assets);
  if (!checksumAsset) {
    throw new UpdateFetchError(
      'missing_checksum',
      `Release v${version} has no SHA256SUMS asset; refusing update without integrity metadata.`,
    );
  }

  let sha256: string | null = null;
  try {
    const checksumResponse = await fetch(checksumAsset.browser_download_url, {
      headers: { 'User-Agent': userAgent(current) },
      signal: AbortSignal.timeout(20_000),
      redirect: 'follow',
    });
    if (checksumResponse.ok) {
      const text = await checksumResponse.text();
      sha256 = parseSha256Sums(text, asset.name);
    }
  } catch {
    sha256 = null;
  }

  if (!sha256) {
    throw new UpdateFetchError(
      'missing_checksum',
      `Release v${version} SHA256SUMS has no entry for "${asset.name}"; refusing update.`,
    );
  }

  const tag = release.tag_name.startsWith('v') ? release.tag_name : `v${version}`;
  const notes = (release.body ?? '').trim();
  const policy = parseCardoReleasePolicy(notes);
  return {
    version,
    tag,
    releaseUrl: release.html_url ?? githubReleasePageUrl(owner, repo, tag),
    notes,
    publishedAt: release.published_at ?? null,
    assetKind,
    installerName: asset.name,
    installerUrl: asset.browser_download_url,
    installerSizeBytes: asset.size,
    sha256,
    minClientVersion: policy.minClientVersion,
    forceUpdateFromNotes: policy.forceUpdateFlag,
  };
}

export async function downloadInstaller(options: {
  url: string;
  destinationPath: string;
  expectedSha256: string;
  expectedSizeBytes: number | null;
  currentVersion: string;
  onProgress?: (progress: {
    percent: number | null;
    downloadedBytes: number;
    totalBytes: number | null;
  }) => void;
  signal?: AbortSignal;
}): Promise<{ path: string; sha256: string; bytes: number }> {
  const expectedSha256 = options.expectedSha256?.trim() ?? '';
  if (!expectedSha256) {
    throw new UpdateFetchError(
      'missing_checksum',
      'Installer download refused: expected SHA-256 is missing.',
    );
  }

  await fs.mkdir(path.dirname(options.destinationPath), { recursive: true });
  const partialPath = `${options.destinationPath}.partial`;

  try {
    await fs.rm(partialPath, { force: true });
  } catch {
    // ignore
  }

  const response = await fetch(options.url, {
    headers: { 'User-Agent': userAgent(options.currentVersion) },
    signal: options.signal ?? AbortSignal.timeout(30 * 60_000),
    redirect: 'follow',
  });
  if (!response.ok || !response.body) {
    throw new UpdateFetchError(
      'download_failed',
      `Installer download failed (${response.status} ${response.statusText}).`,
    );
  }

  const contentLengthHeader = response.headers.get('content-length');
  const totalBytes =
    contentLengthHeader && Number.isFinite(Number(contentLengthHeader))
      ? Number(contentLengthHeader)
      : options.expectedSizeBytes;

  const hash = createHash('sha256');
  let downloadedBytes = 0;
  const nodeStream = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream);
  const fileStream = createWriteStream(partialPath);

  nodeStream.on('data', (chunk: Buffer | string) => {
    const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    hash.update(buf);
    downloadedBytes += buf.byteLength;
    const percent =
      totalBytes && totalBytes > 0
        ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
        : null;
    options.onProgress?.({ percent, downloadedBytes, totalBytes });
  });

  await pipeline(nodeStream, fileStream);

  const sha256 = hash.digest('hex');
  if (sha256.toLowerCase() !== expectedSha256.toLowerCase()) {
    await fs.rm(partialPath, { force: true });
    throw new UpdateFetchError(
      'checksum_mismatch',
      'Downloaded installer failed SHA-256 verification.',
    );
  }

  // Size is a secondary check after integrity hash.
  if (
    options.expectedSizeBytes != null &&
    options.expectedSizeBytes > 0 &&
    downloadedBytes !== options.expectedSizeBytes
  ) {
    await fs.rm(partialPath, { force: true });
    throw new UpdateFetchError(
      'size_mismatch',
      `Downloaded size ${downloadedBytes} does not match expected ${options.expectedSizeBytes}.`,
    );
  }

  await fs.rm(options.destinationPath, { force: true });
  await fs.rename(partialPath, options.destinationPath);
  options.onProgress?.({
    percent: 100,
    downloadedBytes,
    totalBytes: totalBytes ?? downloadedBytes,
  });

  return { path: options.destinationPath, sha256, bytes: downloadedBytes };
}
