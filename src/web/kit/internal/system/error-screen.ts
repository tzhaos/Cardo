/**
 * Unified Cardo fatal / bootstrap error screen.
 * Self-contained styles so it still works when app CSS failed to load.
 */

import { DATABASE_SCHEMA_VERSION } from '../../../../core/database/version';

export type CardoErrorSurface = 'web' | 'extension' | 'desktop' | 'unknown';

export interface CardoErrorAction {
  id: string;
  label: string;
  kind?: 'primary' | 'secondary' | 'ghost';
  /** Built-in: reload | copy | dismiss. Custom handlers via onAction. */
  builtin?: 'reload' | 'copy' | 'dismiss';
}

export interface CardoErrorViewModel {
  title: string;
  summary: string;
  /** Technical detail (Zod dump, stack, raw message). */
  detail?: string;
  code?: string;
  surface: CardoErrorSurface;
  steps: string[];
  hints?: string[];
  actions?: CardoErrorAction[];
}

export interface RenderCardoErrorScreenOptions {
  root?: HTMLElement | null;
  error: unknown;
  surface?: CardoErrorSurface;
  locale?: 'en' | 'zh';
  onAction?: (actionId: string, model: CardoErrorViewModel) => void;
}

const STYLE_ID = 'cardo-error-screen-style';

/**
 * Map raw bootstrap/runtime failures into a user-facing model with checklists.
 */
export function classifyCardoError(
  error: unknown,
  surface: CardoErrorSurface = 'unknown',
  locale: 'en' | 'zh' = 'en',
): CardoErrorViewModel {
  const raw = formatErrorDetail(error);
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : raw || 'Unknown error';
  const zh = locale === 'zh';

  const baseActions: CardoErrorAction[] = [
    { id: 'reload', label: zh ? '重试' : 'Retry', kind: 'primary', builtin: 'reload' },
    { id: 'copy', label: zh ? '复制详情' : 'Copy details', kind: 'secondary', builtin: 'copy' },
  ];

  // Preferences / Zod schema mismatch (stale local service or unmigrated DB).
  if (
    /fontFamily|fontScale|density|themeColorOverrides|layoutProfileId|cssSnippet|featureFlags|importedThemePacks|invalid_value|invalid_union/i.test(
      raw,
    )
  ) {
    return {
      title: zh ? '工作区数据需要升级' : 'Workspace data needs an upgrade',
      summary: zh
        ? '本机服务返回的设置与当前 Cardo 版本不一致。常见原因是仍有旧版在后台运行，或各端版本不一致。'
        : 'Settings from the local service do not match this Cardo version. Often a leftover older process is still running, or surfaces are on different versions.',
      detail: raw,
      code: 'PREFERENCES_SCHEMA_MISMATCH',
      surface,
      steps: zh
        ? [
            '关闭所有 Cardo 窗口，并完全退出应用。',
            '重新启动同一版本的 Cardo。',
            '若仍失败，重新安装与当前版本一致的 Cardo。',
            '确认电脑上没有混用不同版本的安装。',
          ]
        : [
            'Close all Cardo windows and quit the app completely.',
            'Start the same version of Cardo again.',
            'If it still fails, reinstall Cardo at the matching version.',
            'Avoid mixing different Cardo installs on the same machine.',
          ],
      hints: zh
        ? [
            `开发者：cardo stop 后重启；核对 %APPDATA%\\cardo\\discovery.json 中 schemaVersion 为 ${DATABASE_SCHEMA_VERSION}。`,
            '排查时可查看 %APPDATA%\\cardo\\runtime.log。',
          ]
        : [
            `For developers: cardo stop, then restart; confirm discovery.json schemaVersion is ${DATABASE_SCHEMA_VERSION}.`,
            'Support logs: %APPDATA%\\cardo\\runtime.log.',
          ],
      actions: baseActions,
    };
  }

  if (/does not serve \/app|\/app\/ UI|web-runtime static|serveStaticDir/i.test(raw)) {
    return {
      title: zh ? '找不到 Cardo 界面' : 'Cardo interface missing',
      summary: zh
        ? '本机服务已启动，但没有提供可用界面。请使用与本机服务相同版本的 Cardo。'
        : 'The local service is running but is not providing a usable interface. Use a Cardo install that matches the local service version.',
      detail: raw,
      code: 'RUNTIME_NO_APP_UI',
      surface,
      steps: zh
        ? [
            '完全退出后重新启动 Cardo。',
            '重新安装同一版本的 Cardo。',
            '确认桌面端与本机服务来自同一次安装或升级。',
          ]
        : [
            'Quit completely, then start Cardo again.',
            'Reinstall the same version of Cardo.',
            'Make sure Desktop and the local service come from the same install or update.',
          ],
      hints: zh
        ? ['开发者：重新构建并启动桌面端，确认界面资源已随构建产出。']
        : ['For developers: rebuild and start Desktop; confirm UI assets ship with that build.'],
      actions: baseActions,
    };
  }

  if (
    /Runtime|hostPlatform|connect|discovery|__CARDO_RUNTIME|token|ensureHostPlatformReady|could not attach|ensureDesktopRuntime/i.test(
      raw,
    )
  ) {
    return {
      title: zh ? '无法连接本机服务' : 'Cannot connect to the local service',
      summary: zh
        ? '界面需要本机 Cardo 服务才能读写数据。当前未发现可用服务，或连接配置缺失。'
        : 'The interface needs the local Cardo service for data. No healthy service was found, or connection settings are missing.',
      detail: raw,
      code: 'RUNTIME_UNAVAILABLE',
      surface,
      steps:
        surface === 'extension'
          ? zh
            ? [
                '先启动 Cardo 桌面版。',
                '确认浏览器扩展与桌面版配套安装。',
                '点击重试，或重新打开扩展页。',
              ]
            : [
                'Start Cardo Desktop first.',
                'Confirm the browser extension is installed with that Desktop version.',
                'Retry, or reopen the extension page.',
              ]
          : surface === 'desktop'
            ? zh
              ? [
                  '完全退出后重新启动 Cardo。',
                  '若刚升级过，先关闭所有窗口再开一次。',
                  '若仍失败，重新安装同一版本。',
                ]
              : [
                  'Quit completely, then start Cardo again.',
                  'After an upgrade, close every window and open once more.',
                  'If it still fails, reinstall the same version.',
                ]
            : zh
              ? [
                  '用 Cardo 提供的方式重新打开（例如桌面版或 cardo open）。',
                  '确认本机服务已启动后再访问界面。',
                  '不要把长期密钥粘贴进地址栏。',
                ]
              : [
                  'Open Cardo again from the desktop app or cardo open.',
                  'Confirm the local service is running before opening the UI.',
                  'Do not paste long-lived secrets into the address bar.',
                ],
      hints: zh
        ? ['排查时可查看 %APPDATA%\\cardo\\runtime.log。']
        : ['Support logs: %APPDATA%\\cardo\\runtime.log.'],
      actions: baseActions,
    };
  }

  if (/initialize workspace|workspace bootstrap|ensureInitialized/i.test(raw)) {
    return {
      title: zh ? '工作区初始化失败' : 'Workspace failed to initialize',
      summary: zh
        ? '已连上本机服务，但创建或加载工作区时出错。'
        : 'Connected to the local service, but creating or loading the workspace failed.',
      detail: raw,
      code: 'WORKSPACE_INIT_FAILED',
      surface,
      steps: zh
        ? [
            '点击重试一次。',
            '完全退出 Cardo 后再启动。',
            '若刚完成升级，等待首次启动完成后再打开。',
          ]
        : [
            'Click Retry once.',
            'Quit Cardo completely, then start again.',
            'After an upgrade, let the first launch finish before reopening.',
          ],
      hints: zh
        ? ['排查时可查看 %APPDATA%\\cardo\\runtime.log 是否有锁定或迁移错误。']
        : ['Support logs: %APPDATA%\\cardo\\runtime.log for lock or migration errors.'],
      actions: baseActions,
    };
  }

  return {
    title: zh ? 'Cardo 遇到问题' : 'Cardo hit a problem',
    summary: message || (zh ? '发生了未分类错误。' : 'An unclassified error occurred.'),
    detail: raw !== message ? raw : raw,
    code: 'UNKNOWN',
    surface,
    steps: zh
      ? ['点击重试。', '若反复出现，复制详情并保留本地日志以便排查。']
      : ['Click Retry.', 'If it keeps happening, copy details and keep local logs for support.'],
    hints: zh
      ? ['日志位置：%APPDATA%\\cardo\\runtime.log。']
      : ['Log location: %APPDATA%\\cardo\\runtime.log.'],
    actions: baseActions,
  };
}

export function formatErrorDetail(error: unknown): string {
  if (error instanceof Error) {
    const zodIssues = (error as Error & { issues?: unknown }).issues;
    if (zodIssues) {
      return `${error.message}\n\n${safeJson(zodIssues)}`;
    }
    return error.stack ? `${error.message}\n\n${error.stack}` : error.message;
  }
  if (typeof error === 'string') return error;
  return safeJson(error);
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function renderCardoErrorScreen(options: RenderCardoErrorScreenOptions): void {
  const root =
    options.root ?? (typeof document !== 'undefined' ? document.getElementById('root') : null);
  if (!root) return;

  const surface =
    options.surface ??
    (typeof window !== 'undefined' &&
    (Boolean(window.cardoDesktop) || window.__CARDO_RUNTIME_MISSING__ === true)
      ? 'desktop'
      : 'web');
  const locale =
    options.locale ??
    (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')
      ? 'zh'
      : 'en');
  const model = classifyCardoError(options.error, surface, locale);

  ensureStyles();
  root.innerHTML = '';
  root.classList.add('cardo-error-root');

  const shell = el('div', 'cardo-error-shell');
  const card = el('div', 'cardo-error-card');

  const brand = el('div', 'cardo-error-brand');
  brand.innerHTML = `<span class="cardo-error-mark" aria-hidden="true"></span><span>Cardo</span>`;

  const title = el('h1', 'cardo-error-title');
  title.textContent = model.title;

  const summary = el('p', 'cardo-error-summary');
  summary.textContent = model.summary;

  if (model.code) {
    const code = el('p', 'cardo-error-code');
    code.textContent = model.code;
    card.append(brand, title, summary, code);
  } else {
    card.append(brand, title, summary);
  }

  if (model.steps.length > 0) {
    const stepsTitle = el('h2', 'cardo-error-section-title');
    stepsTitle.textContent = locale === 'zh' ? '建议步骤' : 'What to try';
    const list = el('ol', 'cardo-error-steps');
    for (const step of model.steps) {
      const item = el('li');
      item.textContent = step;
      list.append(item);
    }
    card.append(stepsTitle, list);
  }

  if (model.hints?.length) {
    const hints = el('ul', 'cardo-error-hints');
    for (const hint of model.hints) {
      const item = el('li');
      item.textContent = hint;
      hints.append(item);
    }
    card.append(hints);
  }

  if (model.detail) {
    const details = document.createElement('details');
    details.className = 'cardo-error-details';
    const summaryEl = document.createElement('summary');
    summaryEl.textContent = locale === 'zh' ? '技术详情' : 'Technical details';
    const pre = el('pre', 'cardo-error-detail-pre');
    pre.textContent = model.detail;
    details.append(summaryEl, pre);
    card.append(details);
  }

  const actions = el('div', 'cardo-error-actions');
  for (const action of model.actions ?? []) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `cardo-error-btn cardo-error-btn-${action.kind ?? 'secondary'}`;
    button.textContent = action.label;
    button.addEventListener('click', () => {
      if (action.builtin === 'reload') {
        window.location.reload();
        return;
      }
      if (action.builtin === 'copy') {
        const payload = [
          model.title,
          model.summary,
          model.code ? `code: ${model.code}` : '',
          '',
          ...(model.steps.map((step, index) => `${index + 1}. ${step}`) ?? []),
          '',
          model.detail ?? '',
        ]
          .filter(Boolean)
          .join('\n');
        void navigator.clipboard?.writeText(payload).catch(() => {
          // fallback
          const area = document.createElement('textarea');
          area.value = payload;
          document.body.append(area);
          area.select();
          document.execCommand('copy');
          area.remove();
        });
        button.textContent = locale === 'zh' ? '已复制' : 'Copied';
        window.setTimeout(() => {
          button.textContent = action.label;
        }, 1600);
        return;
      }
      if (action.builtin === 'dismiss') {
        root.innerHTML = '';
        return;
      }
      options.onAction?.(action.id, model);
    });
    actions.append(button);
  }
  card.append(actions);

  const footer = el('p', 'cardo-error-footer');
  footer.textContent =
    locale === 'zh'
      ? '需要帮助时，可复制上方技术详情，并附上本机 Cardo 日志。'
      : 'If you need help, copy the technical details above and include your local Cardo logs.';
  card.append(footer);

  shell.append(card);
  root.append(shell);
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = ERROR_SCREEN_CSS;
  document.head.append(style);
}

const ERROR_SCREEN_CSS = `
.cardo-error-root {
  min-height: 100%;
  margin: 0;
}
.cardo-error-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  box-sizing: border-box;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(56, 189, 248, 0.12), transparent 55%),
    radial-gradient(900px 500px at 100% 0%, rgba(99, 102, 241, 0.1), transparent 50%),
    #f4f5f7;
  color: #111827;
  font-family: Inter, "Noto Sans SC", "Microsoft YaHei UI", "PingFang SC", system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) {
  .cardo-error-shell {
    background:
      radial-gradient(1200px 600px at 10% -10%, rgba(56, 189, 248, 0.08), transparent 55%),
      #141517;
    color: #f3f4f6;
  }
  .cardo-error-card {
    background: rgba(32, 33, 36, 0.92) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45) !important;
  }
  .cardo-error-summary, .cardo-error-steps, .cardo-error-hints, .cardo-error-footer {
    color: #c4c7ce !important;
  }
  .cardo-error-detail-pre {
    background: #0f1012 !important;
    color: #e5e7eb !important;
  }
  .cardo-error-btn-secondary {
    background: #2a2b2f !important;
    color: #f3f4f6 !important;
  }
}
.cardo-error-card {
  width: min(36rem, 100%);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 20px;
  padding: 28px 28px 22px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow:
    0 1px 1px rgba(0, 0, 0, 0.03),
    0 12px 32px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(16px);
}
.cardo-error-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  color: #374151;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.cardo-error-mark {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background:
    radial-gradient(circle at 30% 30%, #38bdf8, transparent 55%),
    linear-gradient(145deg, #171c24, #111827);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}
.cardo-error-title {
  margin: 0 0 10px;
  font-size: 1.35rem;
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.3;
}
.cardo-error-summary {
  margin: 0 0 8px;
  color: #4b5563;
  font-size: 0.95rem;
  line-height: 1.55;
}
.cardo-error-code {
  margin: 0 0 16px;
  color: #0ea5e9;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}
.cardo-error-section-title {
  margin: 18px 0 8px;
  font-size: 0.8rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6b7280;
}
.cardo-error-steps {
  margin: 0;
  padding-left: 1.2rem;
  color: #374151;
  font-size: 0.9rem;
  line-height: 1.55;
}
.cardo-error-steps li {
  margin: 0.35rem 0;
}
.cardo-error-hints {
  margin: 12px 0 0;
  padding-left: 1.1rem;
  color: #6b7280;
  font-size: 0.82rem;
  line-height: 1.45;
}
.cardo-error-details {
  margin-top: 18px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
}
.cardo-error-details summary {
  cursor: pointer;
  padding: 10px 12px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #4b5563;
  user-select: none;
}
.cardo-error-detail-pre {
  margin: 0;
  max-height: 220px;
  overflow: auto;
  padding: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  background: #f8fafc;
  color: #111827;
  font-size: 0.72rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}
.cardo-error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}
.cardo-error-btn {
  appearance: none;
  border: 0;
  border-radius: 999px;
  padding: 0.55rem 1rem;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
}
.cardo-error-btn-primary {
  background: #111827;
  color: #f9fafb;
}
.cardo-error-btn-secondary {
  background: #eef2f7;
  color: #111827;
}
.cardo-error-btn-ghost {
  background: transparent;
  color: #6b7280;
}
.cardo-error-footer {
  margin: 18px 0 0;
  color: #9ca3af;
  font-size: 0.75rem;
  line-height: 1.4;
}
`;
