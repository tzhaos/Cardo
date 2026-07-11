/**
 * Serial mutation queue for Runtime commands / history / ensureInitialized.
 */

export class CommandQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private pending = 0;

  get depth(): number {
    return this.pending;
  }

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    this.pending += 1;
    const run = this.tail.then(task, task);
    this.tail = run.then(
      () => {
        this.pending -= 1;
      },
      () => {
        this.pending -= 1;
      },
    );
    return run;
  }
}
