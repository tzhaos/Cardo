/**
 * Extension onboarding when Cardo is unavailable.
 * User-facing product copy only — no architecture or build-process language.
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

type GuideCopy = {
  title: string;
  intro: string;
  stepsTitle: string;
  defaultSteps: readonly string[];
  stepsByKind: Partial<Record<RuntimeGuideKind, readonly string[]>>;
  retry: string;
  detail: string;
  codes: Record<RuntimeGuideKind, string>;
};

const COPY: Record<'en' | 'zh', GuideCopy> = {
  en: {
    title: 'Start Cardo to continue',
    intro: 'Open Cardo on this computer, then try again.',
    stepsTitle: 'Try this:',
    defaultSteps: [
      'Open the Cardo desktop app, or run Cardo from the terminal.',
      'Come back here and click Retry.',
    ],
    stepsByKind: {
      native_host_missing: [
        'Install or reinstall Cardo on this computer.',
        'Fully quit and reopen the browser, then Retry.',
      ],
      runtime_unavailable: [
        'Open the Cardo desktop app, or start Cardo from the terminal.',
        'Wait until Cardo is running, then Retry.',
      ],
      native_messaging_failed: [
        'Reinstall Cardo, then fully quit and reopen the browser.',
        'Click Retry.',
      ],
      connect_failed: ['Make sure Cardo is still open on this computer.', 'Click Retry.'],
    },
    retry: 'Retry',
    detail: 'Details',
    codes: {
      native_host_missing: 'Cardo is not set up for this browser yet.',
      runtime_unavailable: 'Cardo is not running on this computer.',
      native_messaging_failed: 'This browser cannot reach Cardo.',
      connect_failed: 'Could not connect to Cardo.',
      unknown: 'Something went wrong. Please try again.',
    },
  },
  zh: {
    title: '请先启动 Cardo',
    intro: '在本机打开 Cardo 后，再回到此页重试。',
    stepsTitle: '可以这样操作：',
    defaultSteps: ['打开 Cardo 桌面应用，或在终端启动 Cardo。', '返回此页，点击「重试」。'],
    stepsByKind: {
      native_host_missing: ['请安装或重新安装 Cardo。', '完全退出并重新打开浏览器，再点「重试」。'],
      runtime_unavailable: [
        '请打开 Cardo 桌面应用，或在终端启动 Cardo。',
        '确认 Cardo 已运行后，点击「重试」。',
      ],
      native_messaging_failed: [
        '请重新安装 Cardo，然后完全退出并重新打开浏览器。',
        '点击「重试」。',
      ],
      connect_failed: ['请确认本机 Cardo 仍在运行。', '点击「重试」。'],
    },
    retry: '重试',
    detail: '详细信息',
    codes: {
      native_host_missing: '当前浏览器尚未完成 Cardo 设置。',
      runtime_unavailable: '本机未运行 Cardo。',
      native_messaging_failed: '浏览器无法连接 Cardo。',
      connect_failed: '无法连接到 Cardo。',
      unknown: '出现问题，请重试。',
    },
  },
};

export function classifyRuntimeGuideError(error: unknown): {
  kind: RuntimeGuideKind;
  detail: string;
} {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: string }).code ?? '');
    const message =
      error instanceof Error
        ? error.message
        : String((error as { message?: string }).message ?? '');
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

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : error == null
          ? ''
          : (() => {
              try {
                return JSON.stringify(error);
              } catch {
                return '';
              }
            })();
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
  const steps = copy.stepsByKind[kind] ?? copy.defaultSteps;

  root.innerHTML = '';
  const panel = document.createElement('div');
  panel.setAttribute('data-cardo-runtime-guide', kind);
  panel.style.cssText =
    'font-family:system-ui,sans-serif;max-width:36rem;margin:4rem auto;padding:1.75rem;line-height:1.55;color:#111;background:#fafafa;border:1px solid #e5e5e5;border-radius:12px;cursor:default;user-select:none;-webkit-user-select:none;caret-color:transparent;';

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
  for (const step of steps) {
    const item = document.createElement('li');
    item.textContent = step;
    item.style.marginBottom = '0.35rem';
    list.append(item);
  }

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

  const bodyNodes: HTMLElement[] = [title, intro, reason, stepsTitle, list, actions];

  if (detail) {
    const details = document.createElement('details');
    details.style.cssText = 'margin-top:1rem;color:#666;font-size:0.85rem;';
    const summary = document.createElement('summary');
    summary.textContent = copy.detail;
    summary.style.cursor = 'pointer';
    const pre = document.createElement('pre');
    pre.textContent = detail;
    /* Detail diagnostic pre is the only selectable text in the guide. */
    pre.style.cssText =
      'white-space:pre-wrap;word-break:break-word;margin:0.5rem 0 0;font:inherit;cursor:text;user-select:text;-webkit-user-select:text;caret-color:auto;';
    details.append(summary, pre);
    bodyNodes.push(details);
  }

  panel.append(...bodyNodes);
  root.append(panel);
}
