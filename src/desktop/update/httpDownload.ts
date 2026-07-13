/**
 * HTTP(S) download helpers for GitHub update assets.
 * - Optional HTTP CONNECT proxy (Clash / V2RayN / etc.)
 * - Multi-range parallel download when the server accepts Range
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

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const err = new Error('Download aborted');
    err.name = 'AbortError';
    throw err;
  }
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
              // Agent would re-create sockets; tunnel already open.
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
            reject(err);
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
      reject(err);
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

async function downloadSingleStream(options: HttpDownloadOptions): Promise<{
  path: string;
  sha256: string;
  bytes: number;
}> {
  const partialPath = `${options.destinationPath}.partial`;
  await fsp.rm(partialPath, { force: true }).catch(() => undefined);

  const { response } = await requestWithRedirects(options.url, {
    method: 'GET',
    headers: {
      'User-Agent': options.userAgent,
      Accept: '*/*',
    },
    proxyUrl: options.proxyUrl,
    signal: options.signal,
  });

  const status = response.statusCode ?? 0;
  if (status < 200 || status >= 300) {
    response.resume();
    throw new UpdateFetchError(
      'download_failed',
      `Installer download failed (${status} ${response.statusMessage ?? ''}).`,
    );
  }

  const contentLengthHeader = response.headers['content-length'];
  const totalBytes =
    contentLengthHeader && Number.isFinite(Number(contentLengthHeader))
      ? Number(contentLengthHeader)
      : options.expectedSizeBytes;

  const hash = createHash('sha256');
  let downloadedBytes = 0;
  const fileStream = fs.createWriteStream(partialPath);

  await new Promise<void>((resolve, reject) => {
    const fail = (err: unknown) => {
      response.destroy();
      fileStream.destroy();
      reject(err instanceof Error ? err : new Error(String(err)));
    };
    response.on('data', (chunk: Buffer | string) => {
      const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      hash.update(buf);
      downloadedBytes += buf.byteLength;
      const percent =
        totalBytes && totalBytes > 0
          ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
          : null;
      options.onProgress?.({ percent, downloadedBytes, totalBytes });
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

  const sha256 = hash.digest('hex');
  if (sha256.toLowerCase() !== options.expectedSha256.toLowerCase()) {
    await fsp.rm(partialPath, { force: true });
    throw new UpdateFetchError(
      'checksum_mismatch',
      'Downloaded installer failed SHA-256 verification.',
    );
  }

  if (
    options.expectedSizeBytes != null &&
    options.expectedSizeBytes > 0 &&
    downloadedBytes !== options.expectedSizeBytes
  ) {
    await fsp.rm(partialPath, { force: true });
    throw new UpdateFetchError(
      'size_mismatch',
      `Downloaded size ${downloadedBytes} does not match expected ${options.expectedSizeBytes}.`,
    );
  }

  await fsp.rm(options.destinationPath, { force: true });
  await fsp.rename(partialPath, options.destinationPath);
  options.onProgress?.({
    percent: 100,
    downloadedBytes,
    totalBytes: totalBytes ?? downloadedBytes,
  });
  return { path: options.destinationPath, sha256, bytes: downloadedBytes };
}

export async function downloadFileWithOptionalProxy(
  options: HttpDownloadOptions,
): Promise<{ path: string; sha256: string; bytes: number; usedProxy: boolean; parts: number }> {
  const expectedSha256 = options.expectedSha256.trim();
  if (!expectedSha256) {
    throw new UpdateFetchError(
      'missing_checksum',
      'Installer download refused: expected SHA-256 is missing.',
    );
  }

  await fsp.mkdir(path.dirname(options.destinationPath), { recursive: true });
  const partialPath = `${options.destinationPath}.partial`;
  await fsp.rm(partialPath, { force: true }).catch(() => undefined);

  const usedProxy = Boolean(options.proxyUrl);

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
    // fall through to single stream
  }

  const parts = Math.max(1, Math.min(options.parts ?? DEFAULT_PARTS, 16));
  if (!acceptRanges || totalBytes == null || totalBytes < MIN_BYTES_FOR_MULTI || parts <= 1) {
    const result = await downloadSingleStream({
      ...options,
      expectedSha256,
      expectedSizeBytes: totalBytes,
    });
    return { ...result, usedProxy, parts: 1 };
  }

  const fd = await fsp.open(partialPath, 'w');
  await fd.truncate(totalBytes);

  let downloadedBytes = 0;
  const partSize = Math.ceil(totalBytes / parts);
  const report = () => {
    const percent = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
    options.onProgress?.({ percent, downloadedBytes, totalBytes });
  };

  try {
    await Promise.all(
      Array.from({ length: parts }, async (_, index) => {
        const start = index * partSize;
        if (start >= totalBytes) return;
        const end = Math.min(totalBytes - 1, start + partSize - 1);
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
      }),
    );
  } catch (error) {
    await fd.close().catch(() => undefined);
    await fsp.rm(partialPath, { force: true }).catch(() => undefined);
    // Range unsupported mid-flight → single stream with same proxy.
    if (
      error instanceof UpdateFetchError &&
      error.message.includes('falling back to single-stream')
    ) {
      const result = await downloadSingleStream({
        ...options,
        expectedSha256,
        expectedSizeBytes: totalBytes,
      });
      return { ...result, usedProxy, parts: 1 };
    }
    throw error;
  }
  await fd.close();

  const hash = createHash('sha256');
  const fileStream = fs.createReadStream(partialPath);
  for await (const chunk of fileStream) {
    hash.update(chunk as Buffer);
  }
  const sha256 = hash.digest('hex');
  if (sha256.toLowerCase() !== expectedSha256.toLowerCase()) {
    await fsp.rm(partialPath, { force: true });
    throw new UpdateFetchError(
      'checksum_mismatch',
      'Downloaded installer failed SHA-256 verification.',
    );
  }

  await fsp.rm(options.destinationPath, { force: true });
  await fsp.rename(partialPath, options.destinationPath);
  options.onProgress?.({ percent: 100, downloadedBytes: totalBytes, totalBytes });
  return {
    path: options.destinationPath,
    sha256,
    bytes: totalBytes,
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
