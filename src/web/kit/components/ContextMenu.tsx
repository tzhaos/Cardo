/**
 * Context menu host / hooks — re-exported under kit so shell never imports cardo/* directly.
 */
export {
  ContextMenuHost,
  useContextMenu,
  type ContextMenuItem,
} from '../internal/system/context-menu';
