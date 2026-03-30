import type { ReactNode } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export function renderRoot(node: ReactNode, rootId = 'root') {
  const container = document.getElementById(rootId);

  if (!container) {
    throw new Error(`Unable to find root element: #${rootId}`);
  }

  createRoot(container).render(<StrictMode>{node}</StrictMode>);
}
