# web-next redesign development guide

## Purpose

This document is the source of truth for the `src/web-next` rebuild. It captures the agreed product, interaction, visual, and implementation decisions so future AI agents can continue development without re-litigating the design.

The rebuild is not a visual patch to the old web app. It is a new frontend implementation that should eventually replace `src/web` after it is complete. During development, keep old web code runnable and copy only the pieces that are still useful.

## Core direction

- Build the new frontend in `src/web-next`.
- Target web and browser extension verification first.
- Do not optimize for Electron in the first implementation pass; adapt Electron after the new web experience is stable.
- Reuse core domain code only when it helps. Do not let old UI architecture, old templates, old widgets, or old CSS constrain the new implementation.
- The provided prototype images define the visual baseline: airy spatial canvas, soft gray background, floating white capsules, rounded cards, subtle borders, gentle shadows, low visual noise, and small blue/orange/emerald accent icons.
- Prototype screens are not complete product specs. Preserve useful KhaosBox capabilities by reintroducing them through cleaner, quieter interactions.

## Non-goals for the first rebuild

- Do not migrate old workspace data in the new runtime path.
- Do not preserve old box templates such as Inbox, Kanban, Launcher, or old type-bound tabs.
- Do not build a generic reusable box view that all box types share.
- Do not ship a static prototype that only matches screenshots. The new UI must operate on real workspace state.
- Do not implement heavy modal workflows for local box actions unless there is no good local alternative.

Old data migration can be handled later with a dedicated script once the new data model is final.

## Information architecture

### Pages / tabs

The top bar represents user-defined pages, not box-type filters.

Default pages:

- `Workspaces`
- `Personal`
- `Inspiration`

Every page owns an independent spatial canvas. Every page can contain any supported box type.

Pages are a first-class workspace model concept, not a UI-only filter.

Recommended model shape:

```ts
interface WorkspacePage {
  id: string;
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceSnapshot {
  pages: WorkspacePage[];
  activePageId: string;
  defaultPageId: string;
  boxes: WorkspaceBox[];
}

interface WorkspaceBox {
  id: string;
  pageId: string;
  type: 'folder' | 'bookmark' | 'clipboard';
  title: string;
  frame: BoxFrame;
  items: BoxItem[];
  createdAt: string;
  updatedAt: string;
}
```

If implementation reuses existing reducers/codecs, add `pages`, `activePageId`, and `box.pageId` as formal model fields. Do not add compatibility behavior for old missing fields in the core product flow during this rebuild.

## Supported box types

Only implement these three box types in `web-next`:

- Folder Box
- Bookmark Box
- Clipboard Box

Each box type must have a specialized component, data shape, empty state, add-item view, item presentation, and context menu. Avoid generic `BoxContent` abstractions that flatten the interaction into a lowest-common-denominator list.

### Folder Box

Purpose: files, folders, local paths, project resources.

Experience goals:

- Feels like a compact folder window.
- Items can represent files, folders, or local paths.
- Folder/file icons should be quiet and clear.
- Dragging file/path text into the box should eventually feel natural.

### Bookmark Box

Purpose: web resources and links.

Experience goals:

- Shows favicon or generated icon.
- Shows title and compact URL/subtitle.
- Opening a bookmark should be the primary item action.
- Adding should prioritize paste URL and title derivation.

### Clipboard Box

Purpose: clipboard text, reusable snippets, and recently captured content.

Experience goals:

- Emphasizes a compact text preview and recent capture state.
- Pasting plain text into a selected Clipboard Box creates an item immediately.
- Add flow provides a title and text surface for manual clips.
- Opening an item should copy its text back to the clipboard.

## Visual language

### Global canvas

Match the prototype baseline:

- Very light gray or off-white background.
- Soft radial/linear haze, not visible grid by default.
- Large negative space.
- No heavy app chrome.
- Canvas should feel calm and spatial.

Recommended background treatment:

- `#f5f6f8` to `#eef1f4` base.
- Very subtle radial highlights around the center/top.
- Optional noise or blur only if it remains subtle.

### Top bar

The top bar is a centered floating capsule.

Normal state:

- Shows page tabs.
- Active tab has a light gray pill background.
- Right side contains separator, `+`, and edit pencil.
- Bar has large radius, white translucent surface, subtle border, soft shadow.

Edit state:

- Still the same top bar; no separate management modal.
- Tab labels become editable in place.
- Each tab shows a small `×` delete affordance.
- `+` remains inside the bar for adding pages.
- Rightmost action becomes a blue circular check button.

Delete confirm state:

- The entire top bar switches to a confirmation view.
- Do not squeeze confirmation actions into an individual tab.
- Example text: `Delete “Personal” and 3 boxes?`
- Actions: `Cancel` and red `Delete`.
- Clicking outside the bar or pressing `Esc` cancels confirmation.

Drag sorting state:

- Only available in tab edit state.
- Dragged tab becomes slightly transparent and visually lifted.
- Other tabs animate to make room.
- Drop position uses a thin blue insertion indicator.
- Sorting happens only within the top bar.

### Bottom toolbar

The bottom toolbar is another floating capsule near the bottom center.

It should contain core ambient actions such as:

- settings
- search
- create box

Language and color-mode controls live inside Settings rather than occupying permanent toolbar slots.
Settings is a root-level independent menu, not a toolbar drop menu, canvas box, or canvas child. It can remain open while the workspace is used and can be moved by dragging its header.

The create button is a dark circular button on the right. When the create menu is open, the button changes to an `×` state.

### Drop menus

The `+` create menu and all context menus share one visual system:

- Floating white/translucent panel.
- Large rounded corners, around 20-24px.
- Soft shadow.
- Menu rows have icon + label.
- Row hover is a soft gray rounded rectangle.
- Use low-contrast dividers only when grouping is necessary.
- Avoid dense desktop-style menus.

The create menu should initially expose only:

- Folder Box
- Bookmark Box
- Clipboard Box

## Interaction architecture

### Floating menu layer

Implement menus as a real interaction system, not ad-hoc components.

Recommended component/service: `FloatingMenuLayer`.

Responsibilities:

- Owns all global drop menus and context menus.
- Ensures only one global menu is open at a time.
- Supports bottom-toolbar create menu and right-click menus.
- Handles positioning and viewport collision.
- Handles outside click using capture phase so menu item clicks are not swallowed.
- Handles `Esc` close.
- Closes menus on wheel, canvas drag start, or page change.
- Keeps z-index above boxes but below settings panels, toasts, and any future modal-level overlays.
- Menu items support `disabled`, `danger`, `shortcut`, `icon`, and grouped separators.

Layering rule:

- Local box views such as Add Item are not part of the global menu singleton.
- Multiple boxes may be in local add views at the same time.
- Global drop/context menus remain singleton.

### Context menus

Implement object-aware context menus.

Canvas context menu:

- Create Box
- Paste, when supported
- Reset view
- Optional background/grid controls later

Box context menu:

- Rename
- Add Item
- Lock/unlock if implemented
- Move to page
- Duplicate if implemented
- Delete

Item context menu:

- Open
- Edit
- Move to
- Pin/unpin if implemented
- Delete

Use the same drop menu style for all context menus. Suppress the browser default context menu in the new canvas area.

### Click and focus behavior

- If a global menu is open, the first blank-canvas click closes the menu only.
- If no global menu is open, blank-canvas click can clear current focus/selection.
- Clicking inside a menu must not trigger outside-close before the item action runs.
- Box-local add views are independent of global menu close behavior.

### Box movement and resize

- Box dragging is always available from the header.
- Resize handles are not always visible.
- Resize affordances appear lightly on hover near corners/edges.
- Resize should feel calm and not turn the prototype into a heavy editor UI.
- Box minimum sizes must be designed to fit their add-item views. Do not temporarily enlarge boxes only during add.
- While a box is in add-item view, avoid resize interactions that can break form comfort.

## Box add-item flow

This is a major design pillar.

The old small inline add area was too cramped, caused list height changes, and produced UI bugs. The new flow should keep item creation local to the box without becoming a global modal.

Use a box-local view transition:

- Clicking `Add Item` makes that box switch into an add view.
- The add view uses the box itself as the page/frame, similar to navigating to a registration page inside an app.
- Do not keep the original item list visible behind the form.
- The header remains part of the box and communicates the new local view.
- The body is dedicated to the add form and can be visually spacious.
- Cancel/return exits the add view and restores the item list.
- Confirm creates the item, exits the add view, then animates the new item into the list.

Header behavior in add view:

- Left icon can become a back arrow.
- Title changes to `Add Folder Item`, `Add Bookmark`, or `Add Clipboard Item`.
- Right side can provide `Cancel` or a subtle close button.

Draft behavior:

- Each box owns its own add-view state and draft.
- Multiple boxes can be in add view simultaneously.
- Drafts are retained independently when focus moves to another box.
- Drafts are in memory only for now.
- If a user cancels with non-empty draft, use a lightweight discard confirmation inside the box.
- Deleting a box or page can clear its local draft.

Create success animation:

- After confirm, return to the item list.
- Insert the new item at the appropriate location.
- Play a subtle entrance animation for the new item, such as fade + upward settle + brief highlight.
- Avoid large layout jumps.

## Top tab management

The top edit button manages only tabs/pages. It does not affect boxes.

Capabilities in edit state:

- Add tab inside the bar.
- Delete tab.
- Drag-sort tabs.
- Clicking a page sets it as the default startup page instead of activating it.
- The default page has a small blue indicator below its label.
- Confirm/exit edit mode with the rightmost blue check button.
- Keep at least one tab.

Inline rename behavior:

- Double-click tab text outside edit state to edit.
- Edit state does not allow rename, preventing accidental edits while sorting.
- Input width follows text reasonably.
- `Enter` saves current name.
- `Esc` reverts current edit.
- Empty names should either be rejected or restored to previous name.

Add tab behavior:

- Clicking `+` in edit state creates a new tab and immediately starts renaming it.
- New tab should receive a sensible temporary name such as `Untitled`.

Delete behavior:

- If the tab has no boxes, deletion can be immediate.
- If the tab contains boxes, switch the entire top bar into delete confirm view.
- Delete confirm view should say which tab and how many boxes will be removed.
- Confirm deletes the page and its boxes.
- Cancel returns to tab edit state.
- If only one tab remains, deletion is disabled or hidden.

## Box creation

Box creation is page-local.

- Top `+` creates a page only.
- Bottom `+` and canvas context-menu create actions create boxes in the current page.
- If a create menu is opened from a known canvas point, create at that point.
- If opened from the bottom toolbar, create near the current viewport center.
- Use the three supported box types only.

Create menu row labels:

- Folder Box
- Bookmark Box
- Clipboard Box

## Suggested `src/web-next` structure

This is a recommended structure; adapt if implementation reveals a better split.

```txt
src/web-next/
  app/
    WebNextApp.tsx
    bootstrap.tsx
    providers/
    stores/
      workspaceStore.ts
      preferencesStore.ts
      uiStore.ts
  domain/
    workspace.ts
    box.ts
    item.ts
    reducers.ts
    factories.ts
  components/
    top-bar/
      TopBar.tsx
      TabPill.tsx
      TabDeleteConfirmView.tsx
    bottom-toolbar/
      BottomToolbar.tsx
    settings/
      SettingsPanel.tsx
      StateIcons.tsx
    floating-menu/
      FloatingMenuLayer.tsx
      menuTypes.ts
      useFloatingMenu.ts
    canvas/
      WorkspaceCanvas.tsx
      CanvasSurface.tsx
    boxes/
      BaseBoxFrame.tsx
      FolderBox.tsx
      BookmarkBox.tsx
      ClipboardBox.tsx
      add-views/
        FolderAddView.tsx
        BookmarkAddView.tsx
        ClipboardAddView.tsx
    items/
      FolderItem.tsx
      BookmarkItem.tsx
      ClipboardItem.tsx
  i18n/
    messages.ts
    useI18n.ts
  themes/
    themeRegistry.ts
  styles/
    tokens.css
    app.css
    motion.css
  ports/
    index.ts
```

Use clear boundaries:

- `domain` contains new model and pure state operations.
- `stores` adapt domain operations to React.
- `components` contain UI only.
- `floating-menu` is shared infrastructure.
- Each box type owns its own view details.

## Implementation phases

### Phase 1: skeleton and model

- Create `src/web-next` structure.
- Add new workspace model with pages, active page, three box types, and item models.
- Add default workspace factory with the three default pages.
- Add basic store operations: create page, rename page, delete page, reorder pages, set active page, create box, update box frame, delete box, create item.

### Phase 2: visual shell

- Implement app background.
- Implement top bar normal/edit/delete-confirm states.
- Implement bottom toolbar and create menu trigger.
- Implement canvas area and basic box rendering.

### Phase 3: menu system

- Implement `FloatingMenuLayer`.
- Add create box menu.
- Add canvas, box, and item context menus.
- Verify outside click, `Esc`, wheel/drag close, and z-index rules.

### Phase 4: specialized boxes

- Implement Folder, Bookmark, and Clipboard boxes as separate components.
- Implement specialized empty states and item rows/cards.
- Implement drag and resize with quiet hover handles.

### Phase 5: add-item views

- Implement per-box add view state and drafts.
- Build all three specialized add views.
- Add discard confirmation for non-empty drafts.
- Add create success animations.

### Phase 5.5: internationalization and themes

- Add an independent EN/ZH dictionary for `web-next` interface copy.
- Persist locale, theme id, and color mode.
- Keep theme selection independent from light/dark mode.
- Require every built-in or custom theme definition to provide both palettes.
- Add General, Appearance, and About settings sections.

### Phase 6: browser extension verification

- Wire Vite/browser-extension entry to `web-next` behind a controlled switch or direct temporary entry change.
- Verify web and browser plugin flows.
- Keep old web available until explicit replacement.

### Phase 7: old web removal and platform updates

- Remove old `src/web` UI implementation only after the new implementation is complete.
- Write old-data migration script separately.
- Update Electron integration after web/plugin flows are stable.

## Quality checklist

Before considering a phase complete, verify:

- Visual style aligns with the prototype at a glance.
- Top bar interactions stay inside the top bar.
- Box add-item flow is local, spacious, and does not cause list height jitter.
- Multiple boxes can hold independent add drafts.
- Global menus do not conflict with local box views.
- Right-click menus are object-aware and suppress default browser menu.
- Outside click behavior follows the agreed rule.
- Resize affordances are quiet and hover-based.
- Page tabs are user categories, not type filters.
- Any page can create any of the three box types.
- Cross-page box drag highlights the destination tab and lands in a suitable free area.
- Theme switching preserves the current light/dark mode.
- Every theme provides both light and dark palettes.
- No old Inbox/Kanban/Launcher assumptions leak into `web-next`.

## Open decisions for later

These are intentionally deferred:

- Exact persistence format and migration from old workspace data.
- Electron-specific native local file behavior.
- Advanced search experience.
- Rich clipboard history and pinning features.
- Multi-select box operations.
