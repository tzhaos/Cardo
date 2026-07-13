/**
 * HTTP(S) download helpers for GitHub update assets.
 * - Optional HTTP CONNECT proxy (Clash / V2RayN / etc.)
 * - Multi-range parallel download when the server accepts Range
 * - Resume across cancel/restart via .partial + .partial.meta.json
 *
 * Why not a third-party multi-downloader: few libs combine CONNECT proxy +
 * multi-Range + resume + SHA-256 without pulling large stacks; this stays
 * dependency-free in Electron main.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import tls from 'node:tls';
import type { IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';
import { URL } from 'node:url';
import { UpdateFetchError } from './updateErrors';

const DEFAULT_PARTS = 8;
const MIN_BYTES_FOR_MULTI = 2 * 1024 * 1024;
const MAX_REDIRECTS = 8;
const META_VERSION = 1 as const;

export interface DownloadProgress {
  percent: number | null;
  downloadedBytes: number;
  totalBytes: number | null;
}

export interface HttpDownloadOptions {
  url: string;
  destinationPath: string;
  expectedSha256: string;
  expectedSizeBytes: number | null;
  userAgent: string;
  proxyUrl: string | null;
  signal?: AbortSignal;
  onProgress?: (progress: DownloadProgress) => void;
  parts?: number;
}

interface DownloadMeta {
  version: typeof META_VERSION;
  url: string;
  sha256: string;
  totalBytes: number;
  parts: number;
  /** True when that part has been fully written. */
  completed: boolean[];
}

function partialPathFor(destinationPath: string): string {
  return `${destinationPath}.partial`;
}

function metaPathFor(destinationPath: string): string {
  return `${destinationPath}.partial.meta.json`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const err = new Error('Download aborted');
    err.name = 'AbortError';
    throw err;
  }
}

async function readMeta(metaPath: string): Promise<DownloadMeta | null> {
  try {
    const raw = JSON.parse(await fsp.readFile(metaPath, 'utf8')) as unknown;
    if (!raw || typeof raw !== 'object') return null;
    const m = raw as DownloadMeta;
    if (m.version !== META_VERSION) return null;
    if (typeof m.url !== 'string' || typeof m.sha256 !== 'string') return null;
    if (!Number.isInteger(m.totalBytes) || m.totalBytes <= 0) return null;
    if (!Number.isInteger(m.parts) || m.parts <= 0) return null;
    if (!Array.isArray(m.completed) || m.completed.length !== m.parts) return null;
    return m;
  } catch {
    return null;
  }
}

async function writeMeta(metaPath: string, meta: DownloadMeta): Promise<void> {
  await fsp.writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
}

async function clearPartialArtifacts(destinationPath: string): Promise<void> {
  await fsp.rm(partialPathFor(destinationPath), { force: true }).catch(() => undefined);
  await fsp.rm(metaPathFor(destinationPath), { force: true }).catch(() => undefined);
}

function requestOnce(
  targetUrl: string,
  options: {
    method: string;
    headers: Record<string, string>;
    proxyUrl: string | null;
    signal?: AbortSignal;
  },
): Promise<{ response: IncomingMessage; url: string }> {
  return new Promise((resolve, reject) => {
    assertNotAborted(options.signal);
    const url = new URL(targetUrl);
    const isHttps = url.protocol === 'https:';
    const destPort = Number(url.port || (isHttps ? 443 : 80));

    const onAbort = () => {
      reject(Object.assign(new Error('Download aborted'), { name: 'AbortError' }));
    };
    options.signal?.addEventListener('abort', onAbort, { once: true });
    const cleanup = () => options.signal?.removeEventListener('abort', onAbort);

    const handleResponse = (response: IncomingMessage) => {
      cleanup();
      resolve({ response, url: targetUrl });
    };

    if (options.proxyUrl) {
      let proxy: URL;
      try {
        proxy = new URL(options.proxyUrl);
      } catch {
        cleanup();
        reject(new UpdateFetchError('proxy_error', 'Invalid proxy URL.'));
        return;
      }
      const proxyPort = Number(proxy.port || 80);
      const connectReq = http.request({
        host: proxy.hostname,
        port: proxyPort,
        method: 'CONNECT',
        path: `${url.hostname}:${destPort}`,
        headers: {
          Host: `${url.hostname}:${destPort}`,
        },
        timeout: 20_000,
      });

      connectReq.once('connect', (res, socket: Socket, head: Buffer) => {
        if (res.statusCode !== 200) {
          cleanup();
          socket.destroy();
          reject(
            new UpdateFetchError(
              'proxy_error',
              `Proxy CONNECT failed (${res.statusCode ?? 'unknown'}).`,
            ),
          );
          return;
        }
        if (head.length) socket.unshift(head);

        const continueRequest = (stream: Socket) => {
          const req = (isHttps ? https : http).request(
            {
              protocol: url.protocol,
              hostname: url.hostname,
              port: destPort,
              path: `${url.pathname}${url.search}`,
              method: options.method,
              headers: {
                ...options.headers,
                Host: url.host,
              },
              createConnection: () => stream,
              agent: false,
            },
            handleResponse,
          );
          options.signal?.addEventListener(
            'abort',
            () => {
              req.destroy();
            },
            { once: true },
          );
          req.once('error', (err) => {
            cleanup();
            reject(err instanceof Error ? err : new Error(String(err)));
          });
          req.end();
        };

        if (isHttps) {
          const tlsSocket = tls.connect({
            host: url.hostname,
            servername: url.hostname,
            socket,
          });
          tlsSocket.once('error', (err) => {
            cleanup();
            reject(err instanceof Error ? err : new Error(String(err)));
          });
          tlsSocket.once('secureConnect', () => {
            continueRequest(tlsSocket as unknown as Socket);
          });
        } else {
          continueRequest(socket);
        }
      });

      connectReq.once('error', (err) => {
        cleanup();
        reject(
          new UpdateFetchError(
            'proxy_error',
            `Proxy unreachable (${err instanceof Error ? err.message : String(err)}).`,
          ),
        );
      });
      connectReq.once('timeout', () => {
        connectReq.destroy();
        cleanup();
        reject(new UpdateFetchError('proxy_error', 'Proxy connection timed out.'));
      });
      connectReq.end();
      return;
    }

    const req = (isHttps ? https : http).request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: destPort,
        path: `${url.pathname}${url.search}`,
        method: options.method,
        headers: options.headers,
      },
      handleResponse,
    );
    options.signal?.addEventListener(
      'abort',
      () => {
        req.destroy();
      },
      { once: true },
    );
    req.once('error', (err) => {
      cleanup();
      reject(err instanceof Error ? err : new Error(String(err)));
    });
    req.end();
  });
}

async function requestWithRedirects(
  targetUrl: string,
  options: {
    method: string;
    headers: Record<string, string>;
    proxyUrl: string | null;
    signal?: AbortSignal;
  },
  redirects = 0,
): Promise<{ response: IncomingMessage; finalUrl: string }> {
  if (redirects > MAX_REDIRECTS) {
    throw new UpdateFetchError('download_failed', 'Too many redirects while downloading.');
  }
  const { response, url } = await requestOnce(targetUrl, options);
  const status = response.statusCode ?? 0;
  if (status >= 300 && status < 400 && response.headers.location) {
    response.resume();
    const next = new URL(response.headers.location, url).toString();
    return requestWithRedirects(next, options, redirects + 1);
  }
  return { response, finalUrl: url };
}

async function readResponseBuffer(
  response: IncomingMessage,
  onChunk?: (buf: Buffer) => void,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of response) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    chunks.push(buf);
    onChunk?.(buf);
  }
  return Buffer.concat(chunks);
}

async function downloadRange(
  url: string,
  start: number,
  end: number,
  options: {
    userAgent: string;
    proxyUrl: string | null;
    signal?: AbortSignal;
    onChunk?: (n: number) => void;
  },
): Promise<Buffer> {
  const { response } = await requestWithRedirects(url, {
    method: 'GET',
    headers: {
      'User-Agent': options.userAgent,
      Range: `bytes=${start}-${end}`,
      Accept: '*/*',
    },
    proxyUrl: options.proxyUrl,
    signal: options.signal,
  });
  const status = response.statusCode ?? 0;
  if (status === 200 && start > 0) {
    response.resume();
    throw new UpdateFetchError(
      'download_failed',
      'Server ignored Range requests; falling back to single-stream download.',
    );
  }
  if (status !== 206 && status !== 200) {
    response.resume();
    throw new UpdateFetchError(
      'download_failed',
      `Range download failed (${status}) for bytes=${start}-${end}.`,
    );
  }
  return readResponseBuffer(response, (buf) => options.onChunk?.(buf.byteLength));
}

async function hashFile(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = fs.createReadStream(filePath);
  for await (const chunk of stream) {
    hash.update(chunk as Buffer);
  }
  return hash.digest('hex');
}

async function finalizePartial(options: {
  destinationPath: string;
  partialPath: string;
  metaPath: string;
  expectedSha256: string;
  totalBytes: number;
  onProgress?: (progress: DownloadProgress) => void;
}): Promise<{ path: string; sha256: string; bytes: number }> {
  const sha256 = await hashFile(options.partialPath);
  if (sha256.toLowerCase() !== options.expectedSha256.toLowerCase()) {
    await clearPartialArtifacts(options.destinationPath);
    throw new UpdateFetchError(
      'checksum_mismatch',
      'Downloaded installer failed SHA-256 verification.',
    );
  }

  await fsp.rm(options.destinationPath, { force: true });
  await fsp.rename(options.partialPath, options.destinationPath);
  await fsp.rm(options.metaPath, { force: true }).catch(() => undefined);
  options.onProgress?.({
    percent: 100,
    downloadedBytes: options.totalBytes,
    totalBytes: options.totalBytes,
  });
  return { path: options.destinationPath, sha256, bytes: options.totalBytes };
}

/**
 * Single-stream download with optional resume from existing .partial length.
 */
async function downloadSingleStream(
  options: HttpDownloadOptions & {
    totalBytes: number | null;
    resumeFromBytes: number;
  },
): Promise<{ path: string; sha256: string; bytes: number }> {
  const partialPath = partialPathFor(options.destinationPath);
  const metaPath = metaPathFor(options.destinationPath);
  let startAt = Math.max(0, options.resumeFromBytes);

  if (startAt > 0) {
    try {
      const st = await fsp.stat(partialPath);
      startAt = Math.min(startAt, st.size);
    } catch {
      startAt = 0;
    }
  }

  if (startAt === 0) {
    await fsp.rm(partialPath, { force: true }).catch(() => undefined);
  }

  const headers: Record<string, string> = {
    'User-Agent': options.userAgent,
    Accept: '*/*',
  };
  if (startAt > 0) {
    headers.Range = `bytes=${startAt}-`;
  }

  const { response } = await requestWithRedirects(options.url, {
    method: 'GET',
    headers,
    proxyUrl: options.proxyUrl,
    signal: options.signal,
  });

  const status = response.statusCode ?? 0;
  // 200 with resume request means server ignored Range — restart clean.
  if (startAt > 0 && status === 200) {
    response.resume();
    await clearPartialArtifacts(options.destinationPath);
    return downloadSingleStream({ ...options, resumeFromBytes: 0 });
  }
  if (status !== 200 && status !== 206) {
    response.resume();
    throw new UpdateFetchError(
      'download_failed',
      `Installer download failed (${status} ${response.statusMessage ?? ''}).`,
    );
  }

  const contentLengthHeader = response.headers['content-length'];
  let totalBytes = options.totalBytes;
  if (status === 206) {
    const contentRange = String(response.headers['content-range'] ?? '');
    const totalMatch = /\/(\d+)\s*$/.exec(contentRange);
    if (totalMatch) totalBytes = Number(totalMatch[1]);
  } else if (contentLengthHeader && Number.isFinite(Number(contentLengthHeader))) {
    totalBytes = Number(contentLengthHeader);
  }

  const fileStream = fs.createWriteStream(partialPath, {
    flags: startAt > 0 ? 'a' : 'w',
  });

  let downloadedBytes = startAt;
  const report = () => {
    const percent =
      totalBytes && totalBytes > 0
        ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
        : null;
    options.onProgress?.({ percent, downloadedBytes, totalBytes });
  };
  report();

  try {
    await new Promise<void>((resolve, reject) => {
      const fail = (err: unknown) => {
        response.destroy();
        fileStream.destroy();
        reject(err instanceof Error ? err : new Error(String(err)));
      };
      response.on('data', (chunk: Buffer | string) => {
        const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
        downloadedBytes += buf.byteLength;
        report();
        if (!fileStream.write(buf)) {
          response.pause();
          fileStream.once('drain', () => response.resume());
        }
      });
      response.on('end', () => {
        fileStream.end(() => resolve());
      });
      response.on('error', fail);
      fileStream.on('error', fail);
      options.signal?.addEventListener(
        'abort',
        () => {
          fail(Object.assign(new Error('Download aborted'), { name: 'AbortError' }));
        },
        { once: true },
      );
    });
  } catch (error) {
    // Keep partial for resume unless checksum path needs wipe (not here).
    if (!isAbortError(error) && startAt === 0 && downloadedBytes === 0) {
      await fsp.rm(partialPath, { force: true }).catch(() => undefined);
    }
    throw error;
  }

  const finalTotal = totalBytes ?? downloadedBytes;
  // Single-stream resume meta: one synthetic part for next multi attempt or resume.
  await writeMeta(metaPath, {
    version: META_VERSION,
    url: options.url,
    sha256: options.expectedSha256.toLowerCase(),
    totalBytes: finalTotal,
    parts: 1,
    completed: [true],
  });

  return finalizePartial({
    destinationPath: options.destinationPath,
    partialPath,
    metaPath,
    expectedSha256: options.expectedSha256,
    totalBytes: finalTotal,
    onProgress: options.onProgress,
  });
}

function partBounds(
  totalBytes: number,
  parts: number,
  index: number,
): { start: number; end: number } {
  const partSize = Math.ceil(totalBytes / parts);
  const start = index * partSize;
  const end = Math.min(totalBytes - 1, start + partSize - 1);
  return { start, end };
}

/**
 * Multi-part Range download with resume + optional HTTP proxy.
 */
export async function downloadFileWithOptionalProxy(
  options: HttpDownloadOptions,
): Promise<{ path: string; sha256: string; bytes: number; usedProxy: boolean; parts: number }> {
  const expectedSha256 = options.expectedSha256.trim().toLowerCase();
  if (!expectedSha256) {
    throw new UpdateFetchError(
      'missing_checksum',
      'Installer download refused: expected SHA-256 is missing.',
    );
  }

  await fsp.mkdir(path.dirname(options.destinationPath), { recursive: true });
  const partialPath = partialPathFor(options.destinationPath);
  const metaPath = metaPathFor(options.destinationPath);
  const usedProxy = Boolean(options.proxyUrl);

  // Already complete final file with matching size + hash? reuse.
  try {
    const st = await fsp.stat(options.destinationPath);
    if (
      options.expectedSizeBytes != null &&
      options.expectedSizeBytes > 0 &&
      st.size === options.expectedSizeBytes
    ) {
      const existingHash = await hashFile(options.destinationPath);
      if (existingHash.toLowerCase() === expectedSha256) {
        options.onProgress?.({
          percent: 100,
          downloadedBytes: st.size,
          totalBytes: st.size,
        });
        return {
          path: options.destinationPath,
          sha256: existingHash,
          bytes: st.size,
          usedProxy,
          parts: 0,
        };
      }
    }
  } catch {
    // no final file
  }

  let totalBytes = options.expectedSizeBytes;
  let acceptRanges = false;
  try {
    const { response } = await requestWithRedirects(options.url, {
      method: 'HEAD',
      headers: { 'User-Agent': options.userAgent, Accept: '*/*' },
      proxyUrl: options.proxyUrl,
      signal: options.signal,
    });
    const status = response.statusCode ?? 0;
    response.resume();
    if (status >= 200 && status < 300) {
      const cl = response.headers['content-length'];
      if (cl && Number.isFinite(Number(cl))) totalBytes = Number(cl);
      acceptRanges = String(response.headers['accept-ranges'] ?? '')
        .toLowerCase()
        .includes('bytes');
    }
  } catch {
    // fall through
  }

  const preferredParts = Math.max(1, Math.min(options.parts ?? DEFAULT_PARTS, 16));
  let existingMeta = await readMeta(metaPath);

  // Invalidate resume state when URL / checksum / size change.
  if (
    existingMeta &&
    (existingMeta.url !== options.url ||
      existingMeta.sha256 !== expectedSha256 ||
      (totalBytes != null && existingMeta.totalBytes !== totalBytes))
  ) {
    await clearPartialArtifacts(options.destinationPath);
    existingMeta = null;
  }

  if (
    !acceptRanges ||
    totalBytes == null ||
    totalBytes < MIN_BYTES_FOR_MULTI ||
    preferredParts <= 1
  ) {
    let resumeFrom = 0;
    if (existingMeta?.parts === 1 && existingMeta.completed[0] !== true) {
      try {
        resumeFrom = (await fsp.stat(partialPath)).size;
      } catch {
        resumeFrom = 0;
      }
    } else if (!existingMeta) {
      try {
        // orphan partial without meta: only resume if size is plausible
        const st = await fsp.stat(partialPath);
        if (totalBytes != null && st.size > 0 && st.size < totalBytes) {
          resumeFrom = st.size;
        } else if (st.size > 0) {
          await clearPartialArtifacts(options.destinationPath);
        }
      } catch {
        // none
      }
    }

    try {
      const result = await downloadSingleStream({
        ...options,
        expectedSha256,
        totalBytes,
        resumeFromBytes: resumeFrom,
      });
      return { ...result, usedProxy, parts: 1 };
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw error;
    }
  }

  // Multi-part with resume
  const parts = existingMeta?.parts && existingMeta.parts > 0 ? existingMeta.parts : preferredParts;
  let completed =
    existingMeta && existingMeta.parts === parts
      ? [...existingMeta.completed]
      : Array.from({ length: parts }, () => false);

  // Ensure partial file exists at full size for random writes
  let partialExists = false;
  try {
    const st = await fsp.stat(partialPath);
    partialExists = st.size === totalBytes;
  } catch {
    partialExists = false;
  }

  const fd = await fsp.open(partialPath, partialExists ? 'r+' : 'w');
  if (!partialExists) {
    await fd.truncate(totalBytes);
    completed = Array.from({ length: parts }, () => false);
  }

  const meta: DownloadMeta = {
    version: META_VERSION,
    url: options.url,
    sha256: expectedSha256,
    totalBytes,
    parts,
    completed,
  };
  await writeMeta(metaPath, meta);

  let downloadedBytes = 0;
  for (let i = 0; i < parts; i += 1) {
    if (!completed[i]) continue;
    const { start, end } = partBounds(totalBytes, parts, i);
    downloadedBytes += end - start + 1;
  }
  const report = () => {
    const percent = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
    options.onProgress?.({ percent, downloadedBytes, totalBytes });
  };
  report();

  if (completed.every(Boolean)) {
    await fd.close();
    const finalized = await finalizePartial({
      destinationPath: options.destinationPath,
      partialPath,
      metaPath,
      expectedSha256,
      totalBytes,
      onProgress: options.onProgress,
    });
    return {
      path: finalized.path,
      sha256: finalized.sha256,
      bytes: finalized.bytes,
      usedProxy,
      parts,
    };
  }

  try {
    await Promise.all(
      Array.from({ length: parts }, async (_, index) => {
        if (completed[index]) return;
        const { start, end } = partBounds(totalBytes, parts, index);
        if (start >= totalBytes) {
          completed[index] = true;
          return;
        }
        const buffer = await downloadRange(options.url, start, end, {
          userAgent: options.userAgent,
          proxyUrl: options.proxyUrl,
          signal: options.signal,
          onChunk: (n) => {
            downloadedBytes += n;
            report();
          },
        });
        await fd.write(buffer, 0, buffer.length, start);
        completed[index] = true;
        meta.completed = completed;
        await writeMeta(metaPath, meta);
      }),
    );
  } catch (error) {
    await fd.close().catch(() => undefined);
    // Keep partial + meta for resume on abort or transient errors.
    if (
      error instanceof UpdateFetchError &&
      error.message.includes('falling back to single-stream')
    ) {
      await clearPartialArtifacts(options.destinationPath);
      const result = await downloadSingleStream({
        ...options,
        expectedSha256,
        totalBytes,
        resumeFromBytes: 0,
      });
      return { ...result, usedProxy, parts: 1 };
    }
    throw error;
  }
  await fd.close();

  const finalized = await finalizePartial({
    destinationPath: options.destinationPath,
    partialPath,
    metaPath,
    expectedSha256,
    totalBytes,
    onProgress: options.onProgress,
  });
  return {
    path: finalized.path,
    sha256: finalized.sha256,
    bytes: finalized.bytes,
    usedProxy,
    parts,
  };
}

export async function httpGetText(
  url: string,
  options: {
    userAgent: string;
    headers?: Record<string, string>;
    proxyUrl: string | null;
    signal?: AbortSignal;
  },
): Promise<{ status: number; text: string }> {
  const { response } = await requestWithRedirects(url, {
    method: 'GET',
    headers: {
      'User-Agent': options.userAgent,
      Accept: 'application/json, text/plain, */*',
      ...options.headers,
    },
    proxyUrl: options.proxyUrl,
    signal: options.signal,
  });
  const status = response.statusCode ?? 0;
  const buf = await readResponseBuffer(response);
  return { status, text: buf.toString('utf8') };
}
