export interface WebsiteIconPort {
  resolve(url: string): Promise<string | null>;
}
