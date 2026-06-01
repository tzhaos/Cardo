import { toast as sonnerToast } from 'sonner';
import type { MessageKey } from '../../../core/domains/i18n/model/messages';
import type { TranslationParams } from '../../../core/domains/i18n/services/translate';
import type { TranslateFn } from '../hooks/useI18n';

/**
 * Optional param segment: plain `string | number`, or a nested message key resolved via `t`.
 */
export type ToastParamValue = string | number | { i18nKey: MessageKey };

export interface ToastSpec {
  level: 'success' | 'message' | 'error' | 'plain';
  messageKey: MessageKey;
  params?: Record<string, ToastParamValue>;
}

export interface ToastSink {
  success: (message: string) => void;
  message: (message: string) => void;
  error: (message: string) => void;
  plain: (message: string) => void;
}

const defaultToastSink: ToastSink = {
  success: (m) => sonnerToast.success(m),
  message: (m) => sonnerToast.message(m),
  error: (m) => sonnerToast.error(m),
  plain: (m) => sonnerToast(m),
};

export function resolveToastParamValues(
  t: TranslateFn,
  params: Record<string, ToastParamValue> | undefined,
): TranslationParams | undefined {
  if (!params) {
    return undefined;
  }

  const out: TranslationParams = {};

  for (const [key, value] of Object.entries(params)) {
    if (value !== null && typeof value === 'object' && 'i18nKey' in value) {
      out[key] = t(value.i18nKey);
    } else if (typeof value === 'string' || typeof value === 'number') {
      out[key] = value;
    }
  }

  return out;
}

export function presentToastSpec(
  t: TranslateFn,
  spec: ToastSpec | null | undefined,
  sink: ToastSink = defaultToastSink,
): void {
  if (!spec) {
    return;
  }

  const text = t(spec.messageKey, resolveToastParamValues(t, spec.params));

  if (spec.level === 'success') {
    sink.success(text);
    return;
  }

  if (spec.level === 'message') {
    sink.message(text);
    return;
  }

  if (spec.level === 'error') {
    sink.error(text);
    return;
  }

  sink.plain(text);
}

export function presentToastText(
  level: ToastSpec['level'],
  text: string,
  sink: ToastSink = defaultToastSink,
): void {
  if (level === 'success') {
    sink.success(text);
    return;
  }

  if (level === 'message') {
    sink.message(text);
    return;
  }

  if (level === 'error') {
    sink.error(text);
    return;
  }

  sink.plain(text);
}
