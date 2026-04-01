export function createKbeUrl(resourcePath: string) {
  const formattedPath = resourcePath.replace(/\\/g, '/');

  return `kbe:${encodeURI(formattedPath)}`;
}
