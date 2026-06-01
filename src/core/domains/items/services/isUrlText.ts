export function isUrlText(value: string) {
  return /^https?:\/\//i.test(value.trim());
}
