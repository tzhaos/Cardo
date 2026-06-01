export function createKbeUrl(resourcePath: string) {
  const formattedPath = resourcePath.replace(/\\/g, '/');

  if (formattedPath.startsWith('//')) {
    return `kbe:${encodeURIComponent(formattedPath)}`;
  }

  return `kbe:${encodeURI(formattedPath)}`;
}

function toWindowsPath(pathname: string) {
  const withBackslashes = pathname.replace(/\//g, '\\');
  return withBackslashes.replace(/^\\([A-Za-z]:\\)/, '$1');
}

export function parseKbeUrl(input: string) {
  if (!input.startsWith('kbe:')) {
    return null;
  }

  const encodedPayload = input.slice('kbe:'.length);
  const payload = decodeURIComponent(encodedPayload);

  if (payload.startsWith('file://')) {
    const fileUrl = new URL(payload);
    const pathPart = toWindowsPath(fileUrl.pathname);

    if (fileUrl.hostname) {
      return `\\\\${fileUrl.hostname}${pathPart}`;
    }

    return pathPart;
  }

  if (payload.startsWith('//')) {
    return `\\\\${toWindowsPath(payload.slice(2))}`;
  }

  return toWindowsPath(payload);
}
