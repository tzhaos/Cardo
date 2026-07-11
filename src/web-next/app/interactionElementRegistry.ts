const boxElements = new Map<string, HTMLElement>();
const pageDropElements = new Map<string, HTMLElement>();
let canvasElement: HTMLElement | null = null;
let topBarElement: HTMLElement | null = null;

export function registerBoxElement(boxId: string, element: HTMLElement | null) {
  registerElement(boxElements, boxId, element);
}

export function registerPageDropElement(pageId: string, element: HTMLElement | null) {
  registerElement(pageDropElements, pageId, element);
}

export function registerCanvasElement(element: HTMLElement | null) {
  canvasElement = element;
}

export function registerTopBarElement(element: HTMLElement | null) {
  topBarElement = element;
}

export function getBoxElement(boxId: string) {
  return getConnectedElement(boxElements.get(boxId) ?? null);
}

export function getPageDropElement(pageId: string) {
  return getConnectedElement(pageDropElements.get(pageId) ?? null);
}

export function getCanvasElement() {
  return getConnectedElement(canvasElement);
}

export function getTopBarElement() {
  return getConnectedElement(topBarElement);
}

export function findPageDropAtPoint(clientX: number, clientY: number) {
  let nearest: { pageId: string; distance: number } | null = null;
  for (const [pageId, element] of pageDropElements) {
    if (!element.isConnected) {
      pageDropElements.delete(pageId);
      continue;
    }
    const rect = element.getBoundingClientRect();
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      continue;
    }
    const distance = Math.abs(clientX - (rect.left + rect.width / 2));
    if (!nearest || distance < nearest.distance) nearest = { pageId, distance };
  }
  return nearest?.pageId ?? null;
}

function registerElement(
  registry: Map<string, HTMLElement>,
  id: string,
  element: HTMLElement | null,
) {
  if (element) registry.set(id, element);
  else registry.delete(id);
}

function getConnectedElement(element: HTMLElement | null) {
  return element?.isConnected ? element : null;
}
