/**
 * Extension guide UI when Runtime / Native Host is unavailable (design §6.4).
 * Never opens OPFS as a silent second writer.
 */

export type RuntimeGuideKind =
  | 'native_host_missing'
  | 'runtime_unavailable'
  | 'native_messaging_failed'
  | 'connect_failed'
  | 'unknown';

function detectLocale(): 'zh' | 'en' {
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

const COPY = {
  en: {
    title: 'Cardo Runtime required',
    intro:
      'This extension is a client of the local Cardo Runtime. It does not keep a separate business database.',
    stepsTitle: 'To continue:',
    steps: [
      'Start Cardo Desktop, or run `cardo serve` / `cardo open` from the CLI.',
      'Install and register the native messaging host (Desktop install, or the CLI/native-host install step).',
      'Click Retry after Runtime is healthy.',
    ],
    opfsNoteTitle: 'About older extension-only data',
    opfsNote:
      'Workspace data that lived only in the previous extension OPFS store is not merged automatically. Export JSON from an older build, then import into Cardo Runtime if you need that data.',
    retry: 'Retry',
    detail: 'Details',
    codes: {
      native_host_missing: 'Native messaging host is missing or not registered for this browser.',
      runtime_unavailable: 'Cardo Runtime is not running or not reachable.',
      native_messaging_failed: 'Could not talk to the native messaging host.',
      connect_failed: 'Discovered Runtime but failed to connect over HTTP.',
      unknown: 'Something went wrong while connecting to Cardo Runtime.',
    },
  },
  zh: {
    title: '需要 Cardo Runtime',
    intro: '本扩展是本机 Cardo Runtime 的客户端，不会再单独维护业务数据库。',
    stepsTitle: '请按以下步骤操作：',
    steps: [
      '启动 Cardo Desktop，或在 CLI 运行 `cardo serve` / `cardo open`。',
      '安装并注册 Native Messaging Host（Desktop 安装包，或 CLI / native-host 安装步骤）。',
      '确认 Runtime 正常后点击「重试」。',
    ],
    opfsNoteTitle: '关于旧版扩展本地数据',
    opfsNote:
      '仅保存在旧版扩展 OPFS 中的工作区数据不会自动合并。如需保留，请用旧版导出 JSON，再在 Cardo Runtime 中导入。',
    retry: '重试',
    detail: '详细信息',
    codes: {
      native_host_missing: '未找到或未注册本浏览器的 Native Messaging Host。',
      runtime_unavailable: 'Cardo Runtime 未运行或不可达。',
      native_messaging_failed: '无法与 Native Messaging Host 通信。',
      connect_failed: '已发现 Runtime，但 HTTP 连接失败。',
      unknown: '连接 Cardo Runtime 时出现问题。',
    },
  },
} as const;

export function classifyRuntimeGuideError(error: unknown): {
  kind: RuntimeGuideKind;
  detail: string;
} {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: string }).code ?? '');
    const message =
      error instanceof Error ? error.message : String((error as { message?: string }).message ?? '');
    if (code === 'native_host_missing') {
      return { kind: 'native_host_missing', detail: message };
    }
    if (code === 'runtime_unavailable') {
      return { kind: 'runtime_unavailable', detail: message };
    }
    if (code === 'native_messaging_failed') {
      return { kind: 'native_messaging_failed', detail: message };
    }
    if (code === 'connect_failed') {
      return { kind: 'connect_failed', detail: message };
    }
  }

  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/native messaging host|specified native messaging host|not found/i.test(message)) {
    return { kind: 'native_host_missing', detail: message };
  }
  if (/runtime is not|discovery|not reachable|health/i.test(message)) {
    return { kind: 'runtime_unavailable', detail: message };
  }
  return { kind: 'unknown', detail: message };
}

export function renderRuntimeGuide(error: unknown, onRetry: () => void): void {
  const root = document.getElementById('root');
  if (!root) return;

  const locale = detectLocale();
  const copy = COPY[locale];
  const { kind, detail } = classifyRuntimeGuideError(error);

  root.innerHTML = '';
  const panel = document.createElement('div');
  panel.setAttribute('data-cardo-runtime-guide', kind);
  panel.style.cssText =
    'font-family:system-ui,sans-serif;max-width:36rem;margin:4rem auto;padding:1.75rem;line-height:1.55;color:#111;background:#fafafa;border:1px solid #e5e5e5;border-radius:12px;';

  const title = document.createElement('h1');
  title.textContent = copy.title;
  title.style.cssText = 'font-size:1.35rem;margin:0 0 0.75rem;font-weight:600;';

  const intro = document.createElement('p');
  intro.textContent = copy.intro;
  intro.style.margin = '0 0 0.75rem';

  const reason = document.createElement('p');
  reason.textContent = copy.codes[kind];
  reason.style.cssText = 'margin:0 0 1rem;color:#333;';

  const stepsTitle = document.createElement('p');
  stepsTitle.textContent = copy.stepsTitle;
  stepsTitle.style.cssText = 'margin:0 0 0.35rem;font-weight:600;';

  const list = document.createElement('ol');
  list.style.cssText = 'margin:0 0 1.25rem;padding-left:1.25rem;';
  for (const step of copy.steps) {
    const item = document.createElement('li');
    item.textContent = step;
    item.style.marginBottom = '0.35rem';
    list.append(item);
  }

  const opfsTitle = document.createElement('p');
  opfsTitle.textContent = copy.opfsNoteTitle;
  opfsTitle.style.cssText = 'margin:0 0 0.35rem;font-weight:600;';

  const opfsNote = document.createElement('p');
  opfsNote.textContent = copy.opfsNote;
  opfsNote.style.cssText = 'margin:0 0 1.25rem;color:#555;font-size:0.92rem;';

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap;';

  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = copy.retry;
  retry.style.cssText =
    'appearance:none;border:1px solid #111;background:#111;color:#fff;border-radius:8px;padding:0.5rem 1rem;cursor:pointer;font:inherit;';
  retry.addEventListener('click', () => {
    onRetry();
  });

  actions.append(retry);

  if (detail) {
    const details = document.createElement('details');
    details.style.cssText = 'margin-top:1rem;color:#666;font-size:0.85rem;';
    const summary = document.createElement('summary');
    summary.textContent = copy.detail;
    summary.style.cursor = 'pointer';
    const pre = document.createElement('pre');
    pre.textContent = detail;
    pre.style.cssText =
      'white-space:pre-wrap;word-break:break-word;margin:0.5rem 0 0;font:inherit;';
    details.append(summary, pre);
    panel.append(title, intro, reason, stepsTitle, list, opfsTitle, opfsNote, actions, details);
  } else {
    panel.append(title, intro, reason, stepsTitle, list, opfsTitle, opfsNote, actions);
  }

  root.append(panel);
}
