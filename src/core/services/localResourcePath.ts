function trimWrappingQuotes(value: string) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function decodeUrlPathname(pathname: string) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

function normalizeFileUrlPath(fileUrl: string, platform: NodeJS.Platform) {
  let url: URL;

  try {
    url = new URL(fileUrl);
  } catch {
    return { ok: false as const, errorMessage: 'File URL is invalid.' };
  }

  if (url.protocol !== 'file:') {
    return { ok: false as const, errorMessage: 'File URL is invalid.' };
  }

  const pathname = decodeUrlPathname(url.pathname);

  if (platform === 'win32') {
    if (url.hostname) {
      return { ok: true as const, path: `\\\\${url.hostname}${pathname.replace(/\//g, '\\')}` };
    }

    const drivePath = pathname.replace(/^\/([A-Za-z]:)/, '$1');
    return { ok: true as const, path: drivePath.replace(/\//g, '\\') };
  }

  return { ok: true as const, path: url.hostname ? `//${url.hostname}${pathname}` : pathname };
}

export function normalizeLocalResourcePath(
  resourcePath: unknown,
  platform: NodeJS.Platform = process.platform,
) {
  if (typeof resourcePath !== 'string' || resourcePath.trim().length === 0) {
    return { ok: false as const, errorMessage: 'Resource path is empty.' };
  }

  if (resourcePath.includes('\0')) {
    return {
      ok: false as const,
      errorMessage: 'Resource path contains an invalid character.',
    };
  }

  const trimmedPath = trimWrappingQuotes(resourcePath);

  if (/^file:/i.test(trimmedPath)) {
    return normalizeFileUrlPath(trimmedPath, platform);
  }

  if (platform === 'win32') {
    if (/^[A-Za-z]:[\\/]/.test(trimmedPath)) {
      return { ok: true as const, path: trimmedPath.replace(/\//g, '\\') };
    }

    if (/^\\\\[^\\]+\\[^\\]+/.test(trimmedPath)) {
      return { ok: true as const, path: trimmedPath.replace(/\//g, '\\') };
    }
  }

  return { ok: true as const, path: trimmedPath };
}

export function validateLocalResourcePath(resourcePath: unknown) {
  const normalized = normalizeLocalResourcePath(resourcePath);
  return normalized.ok ? null : normalized.errorMessage;
}
