/**
 * Coalesces high-frequency input into at most one update per rendered frame.
 * The latest value always wins, which is what pointer-driven visual feedback needs.
 */
export function createLatestFrameScheduler<T>(callback: (value: T) => void) {
  let frameId: number | null = null;
  let hasPendingValue = false;
  let latestValue: T;

  const flush = () => {
    frameId = null;

    if (!hasPendingValue) {
      return;
    }

    hasPendingValue = false;
    callback(latestValue);
  };

  return {
    schedule(value: T) {
      latestValue = value;
      hasPendingValue = true;

      if (frameId === null) {
        frameId = window.requestAnimationFrame(flush);
      }
    },
    cancel() {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = null;
      hasPendingValue = false;
    },
  };
}
