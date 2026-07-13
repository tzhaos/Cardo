# Cardo 开发约束

1. 输出的 Markdown 内容未经允许禁止使用加粗。
2. 默认不主动跑单元测试（`npm run test` / `test:ts`）；但下方「CI 与本地门禁」中的 format / lint / eslint / validate:themes / build:all 为强制，不得省略。若 CI 因测试失败，则必须本地复现并修复后再推。
3. 每个独立 Feature 或 Fix 完成后必须在本机执行完整构建，不得等用户再提醒：默认 `npm run build:all`（先 `cardo:stop`，再 extension + CLI + web-runtime + desktop + native-host）。仅改单一 surface 且用户只要快速验证时，可用 `npm run build` / `npm run desktop:build` 作中间检查，但任务收尾与开 PR / 合并前仍须 `build:all` 成功后再汇报完成。
4. 涉及 Desktop（含其托管的设置/Web UI）、Main、更新、Native Host 时：`build:all` 不够——它只编 vite 产物，不跑 electron-builder。收尾必须再跑 `npm run desktop:package`（Setup + Portable → `artifacts/desktop-dist/`），汇报写清安装包路径；调试壳用 `desktop:package:debug`。默认一律打安装包，不得只报 `desktop:build` / `build:all` 当作桌面端完成。
5. 项目禁止旧 Schema、旧字段、旧持久化格式和退休机制的兼容代码。
6. Git 协作与发版必须遵守下方「分支、合并与发布」；AI 默认不得在 `main` 上直接堆功能提交。
7. 多 agent / 并行改码结束后，必须再跑一轮 format（或 format:check）；禁止假设「能编译 = CI 会绿」。

## CI 与本地门禁

GitHub Actions `CI`（`.github/workflows/ci.yml`）在 push/PR 到 `main` 时顺序执行，任一步失败整单失败。本地推送 PR 前必须用同一顺序自检，避免「本机构建过了、CI 第一关 format 就挂」类返工。

### CI 实际顺序（权威）

| 顺序 | CI step                     | 本地等价命令                                                                | 失败含义                                      |
| ---- | --------------------------- | --------------------------------------------------------------------------- | --------------------------------------------- |
| 1    | Check formatting            | `npm run format:check`                                                      | Prettier 未对齐；先 `npm run format` 再 check |
| 2    | Run static checks and tests | `npm run check`（= `lint` + `lint:eslint` + `test:ts` + `validate:themes`） | 类型 / ESLint / 单测 / 官方主题校验失败       |
| 3    | Full product build          | `npm run build:all`                                                         | 某一 surface 无法产出 artifacts               |

Release 工作流（tag / workflow_dispatch）会 format:check 并打安装包，不重复跑完整 `check` 的部分逻辑可能因版本而变化；合并进 main 的代码仍以 CI 三关为准。

### 强制本地门禁（AI / 贡献者在 push PR 或请求合并前）

按顺序执行，前一步失败不得跳过后一步「碰运气」：

```text
npm run format          # 或确认无改动后仅 format:check
npm run format:check    # 必须 exit 0；与 CI 第 1 关完全一致
npm run lint            # tsc --noEmit
npm run lint:eslint
npm run validate:themes
npm run build:all       # 合并前完整产物；用户若只要局部验证可先 desktop:build，但 PR 前仍须 build:all
```

说明：

1. `format:check` 与 `build:all` 正交：`build:all` 成功不代表 Prettier 通过。历史事故：多 agent 并行改 TS 后只跑了 build，CI 在 Check formatting 失败。
2. 多 agent / subagent 并行改同一批文件后，编排者负责最终 `npm run format` + `format:check`，不得把「各 agent 自称完成」当作格式正确。
3. 仅改 `docs/**` 且 CI 仍会跑 format（若文档不在 format 路径内）时，仍须保证触及的 `src` / `scripts` / README / eslint 配置已 format；有代码改动一律完整门禁。
4. AI 默认不跑 `test:ts`（见约束第 2 条）；CI 会跑。若用户要求「开 PR / 合并」，推送前至少完成 format:check + lint + lint:eslint + validate:themes + build:all。CI 测挂后再补跑 `npm run test:ts` 修复。
5. 禁止用 `--no-verify`、跳过 hook、或改 CI yml 来「先合再修」除非用户书面要求且仅限当次。
6. 禁止在已知 format:check 或 lint 失败时仍 push 并宣称可合并。
7. Windows 与 GHA windows-latest 对齐：本机门禁优先在 Windows 跑；路径与行尾以仓库 Prettier / .gitattributes 为准，勿手改 CRLF 对抗 CI。

### 合并与 CI 红灯

1. PR 合并前：`Verify and build`（或等价 CI job）必须为 success；`mergeable_state` 非 clean 时先处理冲突与红灯。
2. CI 红灯处理流程：读失败 step 日志 → 本地复现同一命令 → 在同一 PR 分支上 commit 修复 → push → 等绿 → 再合并。
3. 常见红灯与处置：
   - Check formatting → `npm run format` && `npm run format:check`
   - tsc / ESLint → `npm run lint` / `npm run lint:eslint`，修类型与 import 边界
   - validate:themes → `npm run validate:themes`，修官方主题登记 / recipe / settingsChrome
   - test:ts → `npm run test:ts`，修断言或实现
   - build:all → 本机 `npm run build:all`，查缺入口 / asar 路径 / 编译错误
4. 合并后若用户要求发版：仍须在已合入 main 的 tip 上打 tag；不得在红 CI 的 tip 上打发版 tag。

## 分支、合并与发布

采用业界通用主干模型（trunk-based）。`main` 是唯一长期主线：保持可构建、可发版候选状态，但「进入 main」不等于「自动发 GitHub Release」。

### 分支角色

| 分支                                         | 角色                                                                |
| -------------------------------------------- | ------------------------------------------------------------------- |
| `main`                                       | 默认主干；只接受已审查的合并；CI 做校验与 `build:all`，不发布安装包 |
| `feature/*` / `fix/*` / `chore/*` / `docs/*` | 任务分支；贡献者与 AI 的日常工作区                                  |
| `vX.Y.Z` tag                                 | 里程碑发版节点；仅稳定 semver；触发 Desktop Release 工作流          |

不强制维护长期 `dev` 分支。若仓库另有 `dev`/`develop` 开发线，则任务分支先合入该线，再由里程碑 PR 合入 `main`；规则与下表相同，仅把「目标主干」替换为实际开发线。

### AI / 贡献者日常流程（必须）

1. 开始任务前从最新 `main`（或当前开发线）拉出任务分支，命名示例：
   - `feature/settings-update-ui`
   - `fix/desktop-runtime-attach`
   - `chore/agents-git-rules`
2. 在任务分支上开发与提交；一个逻辑变更一个 commit 为佳；消息用 conventional commits（`feat` / `fix` / `chore` / `docs` / `ci` / `refactor` 等）。
3. 推送 PR 前完成本地门禁（「CI 与本地门禁」）；多 agent 收尾必须含 `format` / `format:check`。
4. 完成后在该分支推送远程，并打开 Pull Request 申请合并到 `main`（或开发线）。
5. PR 描述写清：动机、主要改动、风险、验证方式（必须写明是否已跑 `format:check`、`lint`、`lint:eslint`、`validate:themes`、`build:all`）。
6. 等待 CI 全部 success 与审查；红灯只在同一 PR 分支上继续推送修复，不另开无关分支搅乱历史。
7. 未经用户明确要求，禁止：
   - 直接向 `main` push 功能/修复提交
   - `--force` push 到 `main` 或他人分支
   - 自行创建/推送 `v*` 发版 tag
   - 自行触发或改写会对外发包的 Release（除非用户要求处理发版）
   - 合并他人 PR 或关闭 issue（除非用户明确授权）
   - 在 CI 非绿时合并 PR 或打发版 tag

用户若明确说「直接提交到 main / 推 main」，才可在 `main` 上提交并推送；该授权仅对当次指令有效。用户说「开 PR / 合并 / 发版」时，仍须遵守 CI 绿灯与本地门禁，不得用口头授权跳过 format 或 lint。

### 合并策略

1. 默认 Squash merge 或 Rebase 后 merge 均可；保持 `main` 历史可读。
2. 合并前确认：与目标分支无冲突、CI job 全部 success、无秘密与生成物误入（`artifacts/`、`node_modules/`、`.orca/`、`mcps/` 等已 ignore）。
3. 合并后删除已合入的远程任务分支（可选，推荐）。

### 版本与里程碑发布

1. 产品版本为严格 `X.Y.Z`（无 prerelease 后缀）。`package.json` 的 `version` 是 SoT；构建注入 `__APP_VERSION__`；Desktop 安装包版本与此一致。
2. 常规 CI（push/PR 到 `main`）只做 format / check / `build:all`，绝不上传 GitHub Release、绝不 `npm publish`。
3. 仅关键节点发版。触发方式二选一：
   - 在已合入 `main` 的提交上打稳定 tag：`git tag vX.Y.Z && git push origin vX.Y.Z`
   - 或使用 GitHub Actions `Release` 工作流的 `workflow_dispatch`，输入 `X.Y.Z`（可创建 tag）
4. Release 产物以 Desktop 为主（Setup / Portable / SHA256SUMS）。CLI 等其它分发通道后续走 npm，不随每次 CI 产出。
5. Desktop 应用内更新只消费 GitHub 上非 draft、非 prerelease 的 latest stable Release；开发中的 CI artifact 不是更新源。
6. AI 不得擅自 bump 版本号并打 tag；版本推进与发版由用户在里程碑时明确指示。

### 推荐命令备忘

```text
# 开工
git fetch origin
git checkout main
git pull
git checkout -b feature/short-topic

# 收工（顺序固定；与 CI 对齐）
npm run format
npm run format:check
npm run lint
npm run lint:eslint
npm run validate:themes
npm run build:all
git add …
git commit -m "feat(scope): …"
# 若多 agent 改过代码：再次 format + format:check 后再 push
git push -u origin HEAD
# 然后 gh pr create 或由用户在托管平台开 PR 合入 main
# 等 CI 全绿后再 merge

# 里程碑发版（仅维护者 / 用户要求时）
# 1) 确认 main tip CI 绿、已包含发版内容
# 2) 按需对齐 package.json version 与 tag
# 3) git tag -a vX.Y.Z -m "Cardo X.Y.Z" && git push origin vX.Y.Z
```

## Cardo 架构

目标产品名 Cardo。多 client 本机 Runtime 架构、路径政策与协议细节见 `docs/architecture/local-runtime-multi-client.md`；改名清单见 `docs/architecture/cardo-rename-checklist.md`。

Cardo Runtime 是本机唯一权威 SQLite 持有者与业务写路径。CLI、Web、Browser Extension、Desktop 均为对称 client，通过 Zod 校验的 Runtime 协议访问数据，不各自长期持有业务写库。

## 数据架构

1. Drizzle Schema 是持久化关系结构的唯一来源。
2. Zod 是 Command、IPC、导入导出、设置、JSON metadata 与 Runtime 协议等运行时边界的唯一契约。
3. 禁止手写与 Zod Schema 重复的业务 interface；使用 `z.infer` 派生类型。
4. 用户业务写入只能通过 Command Registry，在 Runtime 内单个 Drizzle transaction 中完成。
5. UI 组件和 UI Store 禁止直接导入 Drizzle 表或执行数据库写入。
6. 同进程（Runtime 内）读取使用类型化 Query Function，不建立重型 Query Bus；client 经 Runtime 协议执行 typed query。
7. Zustand 只保存菜单、选择、Rename、Drag、Resize 和动画等临时 UI 状态。
8. 禁止持久化完整 Workspace Snapshot。
9. 操作日志与撤销变更集必须和业务写入处于同一事务。
10. 不采用 Event Sourcing；数据库当前状态是事实来源。

## 平台边界

1. Cardo Runtime（`src/runtime/*`，可由 CLI serve 或 Desktop embed）是本机唯一持库进程：打开 SQLite、跑 migrator、执行 Command/Query/History，并向 client 扇出 revision + InvalidationScope。
2. 四表面角色均为 client，不各自权威写库：
   - CLI：进程管家与入口（`cardo serve` / `cardo open` / status / stop），不是业务 UI。
   - Web：Runtime 托管的静态 UI 或同协议浏览器页，经 RuntimeClient（HTTP + fetch stream）访问数据。
   - Browser Extension：工具栏打开的独立扩展页为 v1 主壳；Native Messaging 发现 Runtime 后注入连接配置，业务 I/O 仅经 RuntimeClient。
   - Desktop：attach-first、embed-if-missing；Renderer 仅 RuntimeClient，与 Web 同 revision 空间。
3. 禁止 Extension OPFS/Worker 权威写库；禁止 Desktop 面向业务的 raw SQL IPC（如 `database:execute`）。
4. Renderer、扩展页面与 Web UI 不得直接持有底层数据库连接。
5. AppPorts 仅承载非 DB 壳能力（clipboard、tabs、fileExport、websiteIcons、localResource 壳路径）；业务读写不经 AppPorts.database。
6. 各表面共享 Schema、Command、Query、错误与协议语义，不共享平台驱动实现（Node sqlite / Electron / 浏览器 API）。
7. Runtime 核心禁止 import electron；可序列化配置用 Zod，宿主能力用 hooks 注入。

## UI 架构

1. 通用 UI 基于进入仓库的 shadcn/ui 源码二次开发，不直接采用默认视觉。产品图形面唯一目录为 `src/web`（已合并历史 `web-next` / `web-v2` 双轨）。
2. `src/web/kit/internal/primitives` 保存 shadcn/Radix 基础源码；`src/web/kit`（及 `kit/components`）为产品级语义组件。业务只组合 kit，禁止旁路 internal。
3. 壳布局在 `src/web/shell`；领域 UI 在 `src/web/features`（Canvas、Box Frame、Item、设置正文等）；应用入口与 stores 在 `src/web/app`。
4. Canvas、Box Frame、Item Layout、Page Tab、Drag Overlay 和 Resize 保持产品专用结构。
5. Radix 管焦点、键盘、Portal 和可访问性；Motion 管连续空间动画；CSS 管颜色、边框和简单 hover；Drag Controller 独占拖拽根节点 transform。
6. 同一个 CSS 属性在同一状态下只能有一个动效所有者。
7. 拖拽和 Resize 帧内禁止提交 Command、写数据库或更新完整 Workspace。
8. 迁移组件时先复现当前视觉与几何，不在同一提交中主动重新设计。
9. 新实现落地后删除对应旧组件和旧 CSS，不长期保留双轨实现。

## 前端实现规范（强制）

历史教训来源：会话 compaction（Fluent 发糊 / 主题 token 失效 / 装错路径误判 UI 消失 / 文案与 i18n）、`docs/reviews` 硬编码与文案审查、`src/web` 现状扫描。细则与证据见 `docs/reviews/worklogs/frontend-history-*.md` 与 `docs/architecture/theme-pack-authoring.md`。下列条款对 AI 与贡献者同等强制。

### 1. 风格与组件统一

1. 产品 UI 只从 `src/web/kit` 导入。推荐路径导入（`kit/button`、`kit/nav-item`、`kit/icon`）；兼容 barrel `kit`。禁止 import `kit/internal/**`。范式：`docs/architecture/cardo-ui-system-paradigm.md`。
2. 底层仍是 shadcn/Radix 源码二次开发（internal）；禁止再引入第二套组件库或复制 shadcn 默认皮肤。
3. 类名与 CSS 变量前缀仅 `cardo-` / `--cardo-*`；禁止 `cardo-kit-*`、`wbn-`、`khaos-` 等双轨前缀。
4. 主题属性仅 `data-cardo-theme`（及材质 `data-cardo-chrome-material`）。图标仅 Lucide（`ThemeIcon`）。控件方言以 Codex recipe 为先；其它主题只加 recipe，不换图标族。
5. 工具栏 / 图标 chrome 的悬停说明用 `HoverTip` 或 `IconButton.tooltip`，禁止主路径依赖原生 `title`（无障碍仍须 `aria-label`）。
6. 用户可见品牌名只写 Cardo；禁止用户面出现 WebNext、Khaos、KhaosBox。
7. 结构基线：收藏 | 页面 | 回收站 | +；主题方言不擅自换 IA。
8. 缺控件先扩 `kit/components`（并加路径 re-export），禁止业务手写「临时好看按钮」。

### 1.1 设置页与表单布局（强制 — 禁止「先堆控件再 inline style」）

历史事故：更新下载代理区把模式/主机/端口塞进 `cardo-settings-card-copy`，并用未定义的 `cardo-settings-field` + 原生 `<select>` + 内联 flex，导致标签贴输入、「保存代理」竖排断行。根因不是 token 失效，而是用错结构槽位。

写设置（或任何「列表行 + 表单」）前，必须先打开同页已有区块（语言、搜索引擎、功能开关、自定义搜索模板）抄结构，禁止从零发明横排表单。

#### 槽位与方言（SoT：`src/web/features/settings/SettingsPanel.tsx` + `src/web/styles/settings.css`）

| 场景 | 必须用的结构 | 禁止 |
| --- | --- | --- |
| 单行设置 | `list-group` > `settings-card`：左 `card-copy` > `span`(+`small`)，右 `Select` / `Switch` / `ToggleGroup` / `Button.cardo-settings-secondary-button` / `Input.cardo-settings-inline-field` | 多控件塞进 `card-copy`；布局用 inline style |
| 多字段（主机、端口） | 同一 `list-group` 里多行 card（左标题、右控件），抄语言/导出 | 主机端口漂在 list-group 外；左右文案与按钮同词 |
| 展开模板 | card 下 `cardo-custom-search-template` | 与行内控件混槽 |
| 右侧多按钮 | `cardo-settings-card-actions` + 每个按钮 `variant="ghost"` + `className="cardo-settings-secondary-button"`（与导出/导入一致） | 裸 `Button` 默认灰边框、不合主题 |
| 下拉 | kit `Select` | 原生 `<select>` |
| 分组标题 | 仅 `cardo-settings-subheading`（span+small） | 用 `cardo-settings-group` 包 subheading——group 在 content 下有 item 表面，标题会像带背景卡片（事故：更新「检查…官方更新」） |
| 可展开合并面板 | 仅自定义色等内部用 `cardo-settings-group` | 普通「标题 + list-group」误套 group |

#### 硬规则

1. `.cardo-settings-card` 是横向控制条，不是通用表单容器；`card-copy` 只放文案树。
2. 新增 class 必须先写 CSS 再引用；禁止布局 inline style。
3. 表面只走 `--cardo-settings-item-*`；subheading 不得落在带 item 表面的容器内。
4. 设置行动作钮必须 `cardo-settings-secondary-button`（同导出数据），禁止未加该类的 default/ghost 裸按钮。
5. 实现前打开同页语言/搜索引擎/导出抄 DOM；完成后目视：标题无卡片底、按钮与导出一致、主机端口在 list-group 内。

### 2. 官方主题适配（classic / glass / fluent / material / swiftui / codex）

1. 官方 id SoT：`OFFICIAL_BUILT_IN_THEME_IDS`（`src/core/contracts/themePack.ts`）。换皮唯一路径：Theme Pack JSON token + `[data-cardo-theme="<id>"]` recipe。
2. 新增或改官方主题必须：登记 id → 登记 recipe 入口 → `themes/builtin/<id>/…` 双色 JSON → recipe CSS → `npm run validate:themes`（与 CI check 一致）。
3. 通用 CSS / 业务组件只消费 `--cardo-*` 变量；禁止在共享 CSS 写死品牌色、危险色、状态色 hex（如 CTA 蓝、删除红、横幅橙）而绕过 token——否则换肤无效（历史事故：add-views / delete / banner / selection ring）。
4. 设置等长文壳背景必须 `var(--cardo-settings-chrome)` / `settingsHover`，且接近不透明；禁止 recipe 用 `#fff` / 半透明 surface / 硬编码 hex 覆盖（Glass 曾踩坑）。
5. 材质用 pack `chrome.material` → `data-cardo-chrome-material`；禁止每个主题复制一套 `backdrop-filter` 业务分叉。
6. 禁止在业务组件用 `themeId === 'fluent' | 'glass' | …` 写样式分支（几何/chip 尺寸等）；允许极少数壳能力分支且必须注释理由。方言进 recipe 或 token。
7. Motion 几何若绑定圆角，用与 token 同步的数值，禁止 Motion 里写 pill `9999` 或未解析的 CSS 变量导致圆角丢失。
8. 改主题 CSS 后必须重建相关 surface 再目视；禁止把「未 rebuild / 装错旧 Programs\Cardo」误判为代码回归。
9. 明暗两套 + 设置窗 / 顶栏 / 底栏 / 盒子 / 下拉至少各看一眼再合入；仅 classic 通过不算主题完成。

### 3. 动效与视觉所有权

1. 所有权划分（不可混用抢同一属性）：
   - Radix：焦点、键盘、Portal、a11y
   - Motion：画布/盒子等连续空间动画
   - CSS：颜色、边框、简单 hover
   - Drag Controller：拖拽根节点 `transform`（独占）
2. 同一 CSS 属性在同一状态下只能有一个动效所有者。
3. 文字壳与设置壳：禁止 scale 进出场、禁止长期用 transform 做定位；进出场仅 opacity；几何 `left/top` 用整数像素（`Math.round`）。历史事故：Fluent 设置「整窗发糊」。
4. 禁止对小图标 / 导航 glyph 叠 `filter: drop-shadow` + Motion scale + `layoutId` 弹簧（易糊）。
5. 设置窗与长文壳默认不要 `backdrop-filter` 糊底；需要玻璃感时走 chrome.material，且正文衬底仍须可读。
6. 盒子拖拽进行中冻结会与拖拽抢布局的 `layoutId` / layout 弹簧，避免指示条与 tab 错位。
7. 悬停 tip、菜单、toast 类文字浮层：优先短时 opacity；勿对文案层做 scale 弹入。
8. 拖拽 / Resize 的 pointer-move 帧：只更新本地 Zustand / motion 预览；禁止 `fireCommand` / `dispatchDatabaseCommand` / 全量 Workspace 提交；命令仅在 pointer up / 确认时提交。

### 4. 文案与 i18n

1. 应用内 React 产品文案唯一目录：`src/web/i18n/messages.ts`（en + zh 同 key）+ `useI18n().t` / `translateWebNext`。新增文案必须双语同时加。
2. 禁止在 JSX 硬编码用户可见中文/英文句子（占位 debug 除外且不得合入）。
3. 禁止草稿/过程体：路线图、「后续」「待定」、GitHub milestone、npm 命令、内部架构说明作为主 UI 文案。
4. 禁止对用户暴露架构黑话作主文案：Runtime、Command、shell、Chrome（壳工程义）、Design Token、Theme Pack 引擎名、OPFS、schemaVersion 裸数字等。产品说法用「本机服务 / 连接状态 / 主题 / 更新」等。
5. 错误页 / 托盘 / 启动对话框 / 更新失败：须有 locale 策略；主文案面向最终用户，技术细节可折叠或次要，禁止 monorepo 开发手册当默认步骤；schema 版本用 `DATABASE_SCHEMA_VERSION` 插值，禁止写死 `9`。
6. 文案风格：正式、简短；设置项避免多余句号与解释性旁白；中英语气对等，忌中英夹生不专业。
7. 产品词统一：收藏用 Favorites 体系（勿混用 Collected Items）；危险操作确认句式一致。
8. 主题包名/描述、扩展 store 文案、welcome seed 等可不进 messages.ts，但须自备 en/zh 且正式；Desktop 托盘不得仅中文硬编码。
9. 删除已下线能力的死 key（如 Zen 残留），勿在新代码引用。

### 5. 缺陷审查清单（改 UI 必过）

提交或宣称完成前，自查：

| 项 | 检查 |
| --- | --- |
| 主题 | classic/glass/fluent/material/swiftui/codex 是否未被硬编码色破坏；设置底是否 token |
| i18n | 新字符串是否 en+zh；有无硬编码；有无架构黑话 |
| 动效 | 文字壳有无 scale；拖拽帧有无写库；属性所有者是否唯一 |
| 双轨 | 有无旧组件/旧 CSS/旧 class 前缀并存 |
| 结构方言 | 设置/列表行是否抄同页结构；有无把表单塞进 `cardo-settings-card-copy`；有无未定义 class / 布局 inline style；Select 是否用 kit |
| 无障碍 | 图标按钮有 aria-label；焦点是否仍走 Radix |
| 安装/构建 | 目视是否用新构建产物与正确安装路径，而非旧 Programs\Cardo |
| 格式 | `format:check`（前端改动同样触发 CI 第一关） |
| 主题校验 | 动过官方主题则 `validate:themes` |

### 6. 常见误判（先排环境再改布局）

1. 「界面空白」：先查 layout 是否被强制 classic、是否装到旧目录、打包是否含 web-runtime、Runtime schema 是否与 UI 匹配，再改布局代码。
2. 「主题没变化」：先 rebuild surface，再查 CSS 是否硬编码、import 顺序、token 是否被 recipe 覆盖。
3. 「拖拽错乱」：先查是否帧内提交 Command、是否 layoutId 与拖拽 transform 冲突。

## 主题包

1. Design Token + Theme Pack 是唯一换皮扩展面；禁止第二套皮肤引擎或旧 token 双轨。
2. JSON 只放可序列化 token；结构方言写在 `src/web/styles/themes/<id>…`，选择器挂 `[data-cardo-theme]`。
3. 浮动壳材质用 `tokens.chrome.material`（glass|solid）与 `data-cardo-chrome-material`，设置壳背景用 `--cardo-settings-chrome`（须不透明）。
4. 文字壳禁止 scale 进出场与长期 transform 定位；几何整数像素。详见 `docs/architecture/theme-pack-authoring.md`。
5. 新增官方主题必须登记 id、recipe 映射，并跑 `npm run validate:themes`（或 `npx tsx scripts/validate-builtin-themes.ts`）。
6. 共享产品 CSS 禁止业务 hex 绕过 token；危险色/强调色/设置壳一律走 `--cardo-*`。
