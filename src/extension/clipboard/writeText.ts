export async function writeExtensionText(text: string) {
  await navigator.clipboard.writeText(text);
}
