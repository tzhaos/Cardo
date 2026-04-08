export function computeResizedBoxDimensions(
  moveEvent: { clientX: number; clientY: number },
  resizeStart: { clientX: number; clientY: number; width: number; height: number },
  options: { minWidth: number; minHeight: number; grid: number },
) {
  let newWidth = Math.max(
    options.minWidth,
    resizeStart.width + moveEvent.clientX - resizeStart.clientX,
  );
  let newHeight = Math.max(
    options.minHeight,
    resizeStart.height + moveEvent.clientY - resizeStart.clientY,
  );

  newWidth = Math.round(newWidth / options.grid) * options.grid;
  newHeight = Math.round(newHeight / options.grid) * options.grid;

  return { width: newWidth, height: newHeight };
}
