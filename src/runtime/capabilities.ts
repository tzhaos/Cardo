import type { RuntimeHostHooks } from './config';

export async function openLocalResourceViaHooks(
  hooks: RuntimeHostHooks,
  resourcePath: string,
): Promise<boolean> {
  return hooks.openLocalResource(resourcePath);
}
