# Cardo 开发约束

1. 输出的 Markdown 内容未经允许禁止使用加粗。
2. 不运行测试，只执行用户指定的浏览器插件和桌面端构建。
3. 每个独立 Feature 或 Fix 在合并前执行 `npm run build:all`（会先 `cardo:stop` 清掉本机 Runtime/Desktop/CLI 实例，再构建 extension + CLI + web-runtime + desktop + native-host）。局部验证可用 `npm run build` / `npm run desktop:build`（二者也会先停实例）。
4. 项目禁止旧 Schema、旧字段、旧持久化格式和退休机制的兼容代码。
5. Git 协作与发版必须遵守下方「分支、合并与发布」；AI 默认不得在 `main` 上直接堆功能提交。

## 分支、合并与发布

采用业界通用主干模型（trunk-based）。`main` 是唯一长期主线：保持可构建、可发版候选状态，但「进入 main」不等于「自动发 GitHub Release」。

### 分支角色

| 分支 | 角色 |
| --- | --- |
| `main` | 默认主干；只接受已审查的合并；CI 做校验与 `build:all`，不发布安装包 |
| `feature/*` / `fix/*` / `chore/*` / `docs/*` | 任务分支；贡献者与 AI 的日常工作区 |
| `vX.Y.Z` tag | 里程碑发版节点；仅稳定 semver；触发 Desktop Release 工作流 |

不强制维护长期 `dev` 分支。若仓库另有 `dev`/`develop` 开发线，则任务分支先合入该线，再由里程碑 PR 合入 `main`；规则与下表相同，仅把「目标主干」替换为实际开发线。

### AI / 贡献者日常流程（必须）

1. 开始任务前从最新 `main`（或当前开发线）拉出任务分支，命名示例：
   - `feature/settings-update-ui`
   - `fix/desktop-runtime-attach`
   - `chore/agents-git-rules`
2. 在任务分支上开发与提交；一个逻辑变更一个 commit 为佳；消息用 conventional commits（`feat` / `fix` / `chore` / `docs` / `ci` / `refactor` 等）。
3. 完成后在该分支推送远程，并打开 Pull Request 申请合并到 `main`（或开发线）。
4. PR 描述写清：动机、主要改动、风险、验证方式（例如是否跑过 `build:all` / Desktop 打包）。
5. 等待 CI 通过与审查；需要时在同一 PR 分支上继续推送修复，不另开无关分支搅乱历史。
6. 未经用户明确要求，禁止：
   - 直接向 `main` push 功能/修复提交
   - `--force` push 到 `main` 或他人分支
   - 自行创建/推送 `v*` 发版 tag
   - 自行触发或改写会对外发包的 Release（除非用户要求处理发版）
   - 合并他人 PR 或关闭 issue（除非用户明确授权）

用户若明确说「直接提交到 main / 推 main」，才可在 `main` 上提交并推送；该授权仅对当次指令有效。

### 合并策略

1. 默认 Squash merge 或 Rebase 后 merge 均可；保持 `main` 历史可读。
2. 合并前确认：与目标分支无冲突、CI 绿、无秘密与生成物误入（`artifacts/`、`node_modules/`、`.orca/`、`mcps/` 等已 ignore）。
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

# 收工
npm run build:all
git add …
git commit -m "feat(scope): …"
git push -u origin HEAD
# 然后 gh pr create 或由用户在托管平台开 PR 合入 main

# 里程碑发版（仅维护者 / 用户要求时）
# 1) 确认 main 已包含发版内容且 version 已对齐
# 2) git tag vX.Y.Z && git push origin vX.Y.Z
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

1. 通用 UI 基于进入仓库的 shadcn/ui 源码二次开发，不直接采用默认视觉。
2. `ui/primitives` 保存 shadcn/Radix 基础源码，`ui/cardo` 保存产品级二次封装，业务组件只组合这些组件。
3. Canvas、Box Frame、Item Layout、Page Tab、Drag Overlay 和 Resize 保持产品专用结构。
4. Radix 管焦点、键盘、Portal 和可访问性；Motion 管连续空间动画；CSS 管颜色、边框和简单 hover；Drag Controller 独占拖拽根节点 transform。
5. 同一个 CSS 属性在同一状态下只能有一个动效所有者。
6. 拖拽和 Resize 帧内禁止提交 Command、写数据库或更新完整 Workspace。
7. 迁移组件时先复现当前视觉与几何，不在同一提交中主动重新设计。
8. 新实现落地后删除对应旧组件和旧 CSS，不长期保留双轨实现。

## 主题包

1. Design Token + Theme Pack 是唯一换皮扩展面；禁止第二套皮肤引擎或旧 token 双轨。
2. JSON 只放可序列化 token；结构方言写在 `src/web-next/styles/themes/<id>…`，选择器挂 `[data-cardo-theme]`。
3. 浮动壳材质用 `tokens.chrome.material`（glass|solid）与 `data-cardo-chrome-material`，设置壳背景用 `--cardo-settings-chrome`（须不透明）。
4. 文字壳禁止 scale 进出场与长期 transform 定位；几何整数像素。详见 `docs/architecture/theme-pack-authoring.md`。
5. 新增官方主题必须登记 id、recipe 映射，并跑 `npx tsx scripts/validate-builtin-themes.ts`。
