export async function writeTextOnWeb(text: string) {
  await navigator.clipboard.writeText(text);
}
