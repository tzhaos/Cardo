function getNearestElement(target: EventTarget | null) {
  if (target instanceof HTMLElement) {
    return target;
  }

  if (target instanceof Node) {
    return target.parentElement;
  }

  return null;
}

export function isEditableElement(target: EventTarget | null) {
  return Boolean(
    getNearestElement(target)?.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]',
    ),
  );
}

export function isFormControlElement(target: EventTarget | null) {
  return Boolean(getNearestElement(target)?.closest('input, textarea, select, button'));
}
