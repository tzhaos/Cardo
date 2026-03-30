export async function writeTextInExtension(text: string) {
  await navigator.clipboard.writeText(text);
}
