import type { RuntimeDocumentEventType } from '../../../core/ports/RuntimeDocumentPort';
import { runtimeDocumentPort } from '../ports/defaultPorts';

export function setRuntimeDocumentTitle(title: string) {
  runtimeDocumentPort.setDocumentTitle(title);
}

export function addRuntimeWindowListener(
  type: RuntimeDocumentEventType,
  listener: (event: unknown) => void,
) {
  runtimeDocumentPort.addWindowListener(type, listener);
}

export function removeRuntimeWindowListener(
  type: RuntimeDocumentEventType,
  listener: (event: unknown) => void,
) {
  runtimeDocumentPort.removeWindowListener(type, listener);
}

export function getRuntimeViewport() {
  return runtimeDocumentPort.getViewport();
}
