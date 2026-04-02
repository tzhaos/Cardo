export function createKbeUrl(resourcePath: string) {
  const formattedPath = resourcePath.replace(/\\/g, '/');

  if (formattedPath.startsWith('//')) {
    return `kbe:${encodeURIComponent(formattedPath)}`;
  }

  return `kbe:${encodeURI(formattedPath)}`;
}
