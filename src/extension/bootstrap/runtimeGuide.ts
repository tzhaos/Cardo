/**
 * Extension guide UI when Runtime / Native Host is unavailable (design §6.4 / PR7).
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

type GuideCopy = {
  title: string;
  intro: string;
  stepsTitle: string;
  defaultSteps: readonly string[];
  stepsByKind: Partial<Record<RuntimeGuideKind, readonly string[]>>;
  opfsNoteTitle: string;
  opfsNote: string;
  installTitle: string;
  installCommands: readonly string[];
  retry: string;
  detail: string;
  codes: Record<RuntimeGuideKind, string>;
};

const COPY: Record<'en' | 'zh', GuideCopy> = {
  en: {
    title: 'Cardo Runtime required',
    intro:
      'This extension is a client of the local Cardo Runtime. It does not keep a separate business database.',
    stepsTitle: 'To continue:',
    defaultSteps: [
      'Start Cardo Desktop, or run `cardo serve` / `cardo open` from the CLI.',
      'Install and register the native messaging host for this browser.',
      'Click Retry after Runtime is healthy.',
    ],
    stepsByKind: {
      native_host_missing: [
        'Build and register the host: `npm run native-host:install` (Chrome/Edge).',
        'Or install Cardo Desktop, which registers the same host.',
        'Reload this extension page, then click Retry.',
      ],
      runtime_unavailable: [
        'Start Cardo Desktop, or run `cardo serve` (foreground) / `cardo open` (detached + browser).',
        'Confirm with `cardo status` that Runtime is healthy.',
        'Keep the native messaging host installed so the extension can discover Runtime.',
        'Click Retry when Runtime is up.',
      ],
      native_messaging_failed: [
        'Reinstall the native messaging host: `npm run native-host:install`.',
        'Ensure this browser profile matches the host registration (Chrome/Edge).',
        'Restart the browser after install, then Retry.',
      ],
      connect_failed: [
        'Runtime was discovered, but HTTP connect failed — check that Runtime is still running (`cardo status`).',
        'If you just stopped Runtime, start it again with Desktop or `cardo open`.',
        'Click Retry to re-discover and reconnect.',
      ],
    },
    opfsNoteTitle: 'About older extension-only data',
    opfsNote:
      'Workspace data that lived only in the previous extension OPFS store is not merged automatically. Export JSON from an older build, then use Settings → Import workspace in any Cardo client connected to Runtime.',
    installTitle: 'Useful commands',
    installCommands: [
      'cardo serve     # foreground Runtime',
      'cardo open      # spawn Runtime if needed, open Web',
      'cardo status    # health / diagnostics',
      'npm run native-host:install',
    ],
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
    defaultSteps: [
      '启动 Cardo Desktop，或在 CLI 运行 `cardo serve` / `cardo open`。',
      '为本浏览器安装并注册 Native Messaging Host。',
      '确认 Runtime 正常后点击「重试」。',
    ],
    stepsByKind: {
      native_host_missing: [
        '构建并注册 Host：`npm run native-host:install`（Chrome/Edge）。',
        '或安装 Cardo Desktop（会注册同一 Host）。',
        '重新加载本扩展页，再点击「重试」。',
      ],
      runtime_unavailable: [
        '启动 Cardo Desktop，或运行 `cardo serve`（前台）/ `cardo open`（分离进程并打开 Web）。',
        '用 `cardo status` 确认 Runtime 健康。',
        '保持 Native Messaging Host 已安装，以便扩展发现 Runtime。',
        'Runtime 就绪后点击「重试」。',
      ],
      native_messaging_failed: [
        '重新安装 Native Messaging Host：`npm run native-host:install`。',
        '确认当前浏览器配置文件与 Host 注册一致（Chrome/Edge）。',
        '安装后重启浏览器，再「重试」。',
      ],
      connect_failed: [
        '已发现 Runtime，但 HTTP 连接失败 — 请用 `cardo status` 确认仍在运行。',
        '若刚停止 Runtime，请用 Desktop 或 `cardo open` 重新启动。',
        '点击「重试」以重新发现并连接。',
      ],
    },
    opfsNoteTitle: '关于旧版扩展本地数据',
    opfsNote:
      '仅保存在旧版扩展 OPFS 中的工作区数据不会自动合并。请用旧版导出 JSON，再在任意已连接 Runtime 的 Cardo 客户端中通过「设置 → 导入工作区」导入。',
    installTitle: '常用命令',
    installCommands: [
      'cardo serve     # 前台 Runtime',
      'cardo open      # 按需启动 Runtime 并打开 Web',
      'cardo status    # 健康 / 诊断',
      'npm run native-host:install',
    ],
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
};

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
  const steps = copy.stepsByKind[kind] ?? copy.defaultSteps;

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
  list.style.cssText = 'margin:0 0 1rem;padding-left:1.25rem;';
  for (const step of steps) {
    const item = document.createElement('li');
    item.textContent = step;
    item.style.marginBottom = '0.35rem';
    list.append(item);
  }

  const installTitle = document.createElement('p');
  installTitle.textContent = copy.installTitle;
  installTitle.style.cssText = 'margin:0 0 0.35rem;font-weight:600;';

  const installPre = document.createElement('pre');
  installPre.textContent = copy.installCommands.join('\n');
  installPre.style.cssText =
    'margin:0 0 1.25rem;padding:0.75rem 0.9rem;border-radius:8px;background:#f0f0f0;color:#222;font:0.82rem/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow-x:auto;';

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

  const bodyNodes: HTMLElement[] = [
    title,
    intro,
    reason,
    stepsTitle,
    list,
    installTitle,
    installPre,
    opfsTitle,
    opfsNote,
    actions,
  ];

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
    bodyNodes.push(details);
  }

  panel.append(...bodyNodes);
  root.append(panel);
}
