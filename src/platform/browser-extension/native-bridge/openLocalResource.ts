export function openLocalResourceInExtension(resourcePath: string) {
  const formattedPath = resourcePath.replace(/\\/g, '/');
  window.open(`localexplorer:${formattedPath}`, '_blank');
}
