import { createRoot } from 'react-dom/client';
import type { ReactNode } from 'react';

export function renderWebNextRoot(node: ReactNode, rootId = 'root') {
  const rootElement = document.getElementById(rootId);

  if (!rootElement) {
    throw new Error(`Missing #${rootId} root element`);
  }

  createRoot(rootElement).render(node);
}
