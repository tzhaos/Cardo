# Cardo 架构总览

面向新贡献者的入口文档（约 2–4 页）。细节 SoT 见 [local-runtime-multi-client.md](./local-runtime-multi-client.md)。

| Field | Value |
| --- | --- |
| Status | Active |
| Date | 2026-07-14 |
| Related | `AGENTS.md`, architecture index [README.md](./README.md) |

---

## 1. 产品是什么

Cardo（拉丁 cardo：门枢 / 枢纽）是本机优先的空间工作台：在无限画布上用盒子组织链接、笔记、本地文件/文件夹与剪贴片段，支持多页、收藏与回收站。

它不是「仅浏览器插件」或「仅桌面安装包」，而是一个本机 Runtime 加上多个对称 client：

- CLI（`cardo`）— 进程管家与入口
- Web UI — Runtime 托管的图形界面
- Browser Extension — 工具栏打开的扩展页 client
- Desktop — Electron 壳；优先 attach 已有 Runtime

共享同一份 React UI（`src/web`）与同一 revision 空间。

---

## 2. 核心模型：一个 Runtime

```text
CLI / Web / Extension / Desktop
            │
            ▼
    Cardo Runtime（唯一写库进程）
      · SQLite: cardo.sqlite
      · Command 队列（串行）
      · Query / History
      · revision + InvalidationScope 扇出
            │
            ▼
        磁盘数据目录（Path SoT: cardo/）
```

要点：

1. Runtime 是本机唯一权威 SQLite 持有者与业务写路径。
2. 成功 mutation 在同一 Drizzle transaction 中写业务数据、operation log、history，并 `runtime_meta.revision++`。
3. Client 不持有长期业务写库；无 OPFS 权威写、无 Desktop `database:execute`。
4. 观察路径：HTTP + fetch stream（带 Authorization），按 scope 重新 typed query。
5. Zod 是 Command、协议、导入导出、设置与 JSON metadata 的运行时边界；Drizzle schema 是关系结构 SoT。
6. Zustand 只存菜单、选择、拖拽、resize 等临时 UI 状态，不持久化完整 Workspace Snapshot。

当前 schema：`DATABASE_SCHEMA_VERSION = 9`（`src/core/database/version.ts`），仅 forward N→N+1 迁移。

---

## 3. 四表面角色

| 表面 | 入口代码 | 如何连上 Runtime |
| --- | --- | --- |
| Runtime | `src/runtime/*` | 自身；写 lock + discovery |
| CLI | `src/cli/main.ts` | `serve` 前台宿主；`open` 可 spawn detached |
| Web | `src/web-runtime` + `src/web` | 同源 `/app/`；bootstrap 用 one-time code |
| Extension | `src/extension/*` | Native Messaging `runtime.discover` → HTTP |
| Desktop | `src/desktop/*` | attach 已有；否则 spawn detached `runtime-child` |

Desktop 注意：Main 进程不 in-process 持库。embed-if-missing = 分离 Runtime 子进程（`src/desktop/runtimeChild.ts`），然后与 Web 一样走 RuntimeClient。

Native Messaging host（`src/native-host/*`）只读 discovery，永不 open SQLite。

---

## 4. 代码落在哪里

```text
src/
├── core/           领域契约 (Zod)、Command/Query/History、Drizzle、ports
│   ├── contracts/  workspaceCommands、runtimeProtocol、preferences…
│   ├── application/ executeDatabaseCommand、invalidationScopes、historyEngine
│   └── database/   schema、migrator、revision、workspaceQueries
├── runtime/        HTTP、lock、discovery、auth、events、commandQueue、paths
├── client/         RuntimeClient（HTTP + fetch stream）
├── cli/            cardo serve | open | status | stop
├── web/            共享产品 UI（app / shell / features / kit / styles / themes / i18n / platform）
├── web-runtime/    托管 UI 入口（Vite base /app/）
├── extension/      MV3 bootstrap、Chrome ports、NM discover
├── desktop/        Electron main / preload / ensureDesktopRuntime / update
└── native-host/    瘦 NM host

docs/architecture/  本目录：SoT 与主题、运维文档
themes/builtin/     官方主题包 token JSON
artifacts/          构建产物（gitignore）
```

路径 SoT（数据目录，非仓库）：

| OS | 默认 |
| --- | --- |
| Windows | `%APPDATA%/cardo/cardo.sqlite` |
| macOS | `~/Library/Application Support/cardo/cardo.sqlite` |
| Linux | `${XDG_CONFIG_HOME:-~/.config}/cardo/cardo.sqlite` |

可用环境变量 `CARDO_DATA_DIR` 覆盖数据目录。

---

## 5. 本地如何跑

前置：Node.js 22+、npm。Desktop 打包当前以 Windows 为主路径。

```text
npm install

# 构建 CLI + 托管 Web UI
npm run cardo:build

# 日常：确保 Runtime 并打开浏览器（无 Runtime 时 spawn detached）
npm run cardo -- open

# 前台 Runtime（开发时常用；阻塞终端）
npm run cardo -- serve

# 状态 / 强制停止
npm run cardo -- status
npm run cardo -- stop
```

扩展：

```text
npm run build
npm run native-host:install
# Chrome/Edge → 加载 artifacts/extension/unpacked
# 需 Runtime 已运行
```

Desktop：

```text
npm run desktop:start          # 构建并启动 Electron
npm run desktop:package        # NSIS + portable 等（会先停本机实例）
```

全量构建（合并前推荐）：

```text
npm run build:all
```

会先 `cardo:stop` 清掉本机 Runtime/Desktop/CLI 实例，再构建 extension + CLI + web-runtime + desktop + native-host。

约束摘要（完整见 `AGENTS.md`）：

- 不在 `main` 上直接堆功能；用 `feature/*` / `fix/*` 等任务分支 + PR
- Markdown 文档默认不用加粗
- 禁止旧 schema / 旧字段兼容 shim 与 soft column repair

---

## 6. 如何发版

1. `package.json` 的 `version` 是产品版本 SoT（严格 `X.Y.Z`，无 prerelease）。
2. 常规 CI（push/PR 到 `main`）：format / check / `build:all`，不上传 Release、不 npm publish。
3. 里程碑 Desktop 发版（二选一）：
   - 在已合入 `main` 的提交上：`git tag vX.Y.Z && git push origin vX.Y.Z`
   - 或 GitHub Actions `Release` 工作流 `workflow_dispatch`，输入 `X.Y.Z`
4. Release 产物以 Desktop 为主（Setup / Portable / SHA256SUMS）。应用内更新只消费非 draft、非 prerelease 的 latest stable，并校验 SHA-256。
5. 版本 bump 与打 tag 由维护者在里程碑明确指示；AI 默认不得擅自发版。

分支模型：trunk-based；`main` 为唯一长期主线。日常在任务分支开发，PR 合入 `main`。

---

## 7. 接着读什么

| 文档 | 内容 |
| --- | --- |
| [local-runtime-multi-client.md](./local-runtime-multi-client.md) | Runtime 拓扑、Hard Decisions、协议、session、迁移 |
| [robustness-and-operations.md](./robustness-and-operations.md) | lock、日志、启停、更新通道、恢复、威胁模型 |
| [theme-pack-authoring.md](./theme-pack-authoring.md) | 主题包写作 |
| [ui-theme-system.md](./ui-theme-system.md) | 主题系统总览 |
| [README.md](./README.md) | 本目录索引 |
| 仓库根 `AGENTS.md` | 贡献者硬约束 |
| 仓库根 `README.md` / `README_zh.md` | 产品介绍与快速开始 |
