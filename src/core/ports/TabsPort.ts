/** Port for browser tab operations (opening URLs). */
export interface TabsPort {
  openUrl(url: string): void;
}
