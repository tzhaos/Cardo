/** Port for browser tab operations (opening URLs). */
export interface TabsPort {
  /** Open a URL in the host browser / OS. May reject or throw on failure. */
  openUrl(url: string): void | Promise<void>;
}
