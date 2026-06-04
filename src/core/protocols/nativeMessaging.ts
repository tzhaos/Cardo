export const KHAOSBOX_NATIVE_HOST_NAME = 'com.khaosbox.local_bridge';

export type NativeHostRequest = {
  type: 'open-local-resource';
  resourcePath: string;
};

export type NativeHostResponse =
  | {
      ok: true;
    }
  | {
      ok: false;
      errorMessage: string;
    };

export function isNativeHostResponse(value: unknown): value is NativeHostResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const response = value as { ok?: unknown; errorMessage?: unknown };

  return (
    response.ok === true || (response.ok === false && typeof response.errorMessage === 'string')
  );
}
