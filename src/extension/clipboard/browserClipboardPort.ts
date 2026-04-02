import type { ClipboardPort } from '../../app/ports/ClipboardPort';

export const browserClipboardPort: ClipboardPort = {
  readText: () => navigator.clipboard.readText(),
  writeText: (text) => navigator.clipboard.writeText(text),
};
