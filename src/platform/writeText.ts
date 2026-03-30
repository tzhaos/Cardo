import { writeTextInExtension } from './browser-extension/clipboard/writeText';
import { isExtensionRuntime } from './runtime/environment';
import { writeTextOnWeb } from './web/clipboard/writeText';

export async function writeText(text: string) {
  if (isExtensionRuntime()) {
    await writeTextInExtension(text);
    return;
  }

  await writeTextOnWeb(text);
}
