const boxElements = new Map<string, HTMLElement>();
const pageDropElements = new Map<string, HTMLElement>();
let canvasElement: HTMLElement | null = null;
/** Primary nav hit region (sidebar product-nav root). */
let primaryNavElement: HTMLElement | null = null;

export function registerBoxElement(boxId: string, element: HTMLElement | null) {
  registerElement(boxElements, boxId, element);
}

export function registerPageDropElement(pageId: string, element: HTMLElement | null) {
  registerElement(pageDropElements, pageId, element);
}

export function registerCanvasElement(element: HTMLElement | null) {
  canvasElement = element;
}

/** Register the primary nav hit region (sidebar product-nav root). */
export function registerPrimaryNavElement(element: HTMLElement | null) {
  primaryNavElement = element;
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

/** Primary nav hit region (sidebar product-nav root). */
export function getPrimaryNavElement() {
  return getConnectedElement(primaryNavElement);
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
    // Sidebar nav is a vertical list — pick the row whose vertical center is closest.
    const distance = Math.abs(clientY - (rect.top + rect.height / 2));
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
