<p align="center">
  <a href="./README.md">English</a> · <a href="./README_zh.md">中文</a>
</p>

<p align="center">
  <img src="./assets/brand/cardo-lockup.svg" alt="Cardo" width="280"/>
</p>

<p align="center">
  本机优先的空间工作台 · 一个 Runtime · 多种客户端
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-1C1C1E?style=flat-square" alt="version"/>
  <img src="https://img.shields.io/badge/license-MIT-6E6E73?style=flat-square" alt="license"/>
  <img src="https://img.shields.io/badge/runtime-local%20SQLite-111827?style=flat-square" alt="runtime"/>
  <img src="https://img.shields.io/badge/clients-CLI%20%7C%20Web%20%7C%20Extension%20%7C%20Desktop-374151?style=flat-square" alt="clients"/>
  <img src="https://img.shields.io/badge/i18n-en%20%2F%20zh-4B5563?style=flat-square" alt="i18n"/>
</p>

<p align="center">
  <img src="./docs/assets/readme/hero.jpg" alt="Cardo 空间工作区概念图" width="920"/>
</p>

---

## Cardo 是什么？

Cardo（拉丁语 cardo：门枢 / 枢纽 / 轴线）是本机优先的空间工作台。你在无限画布上用自由布局的「盒子」收纳链接、笔记、文件、文件夹、网站收藏和快速启动入口；用「页面」划分工作区，并提供收藏与回收站。

它不是「只有插件」或「只有桌面端」：产品围绕本机唯一权威 Runtime 展开，多表面对称接入同一工作区。

| 表面           | 角色                                                 |
| -------------- | ---------------------------------------------------- |
| Cardo Runtime  | 唯一 SQLite 持有者与业务写路径                       |
| CLI（`cardo`） | 进程管家：`serve` / `open` / `status` / `stop`       |
| Web UI         | Runtime 托管在 `/app/` 的图形客户端                  |
| 浏览器扩展     | Manifest V3 客户端；经 Native Messaging 发现 Runtime |
| 桌面端         | Electron 壳；优先 attach，缺失则 embed               |

所有图形表面共用同一套 React UI（`src/web`），经 Zod 校验的协议访问 Runtime。扩展 OPFS 与桌面 raw SQL IPC 都不会成为第二套长期业务库。

<p align="center">
  <img src="./docs/assets/readme/surfaces.svg" alt="四种表面，同一工作区" width="920"/>
</p>

---

## 产品亮点

<p align="center">
  <img src="./docs/assets/readme/features.svg" alt="功能亮点" width="920"/>
</p>

### 空间工作区

- 自由画布：平移、锁定视口、回到原点
- 盒子可拖拽、缩放、锁定、换色，并在列表 / 网格间切换
- 条目类型：书签、剪贴板片段、本地文件 / 文件夹 / 快捷方式
- 选中盒子后粘贴文字、网址或本地路径即可入库；未选中时在中心新建临时盒
- 多页面工作区、收藏（只读引用视图）、回收站恢复

### 本机 Runtime 权威

- 单一进程持有 `cardo.sqlite`，执行 Command / Query / History
- 业务写入在单个 Drizzle 事务中完成，并与操作日志、撤销变更集同事务
- 客户端经 HTTP + fetch stream 订阅 invalidation，共享 revision 空间
- 不做 CRDT、不做双写同步、不用完整 Workspace Snapshot 当协议

### 产品壳层

- 侧栏壳：页面、收藏、回收站、设置脚；主面板标题工具
- 撤销 / 重做、画布工具、底栏搜索 / 新建盒子
- 跨页面、盒子与条目的全局搜索
- 内置主题：Classic、Glass、Fluent、Material、SwiftUI、Codex
- 界面语言：English / 中文
- 功能目录可开关壳层插槽（设置 → 界面）

### 壳能力（非数据库端口）

- 剪贴板、浏览器标签、网站图标、文件导出
- 经 Runtime 能力打开本地路径（Native Messaging 仅为瘦 discover / 可选 relay，永不打开 SQLite）

---

## 架构

<p align="center">
  <img src="./docs/assets/readme/architecture.svg" alt="Cardo 多客户端架构" width="920"/>
</p>

```text
                    ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌─────────┐
                    │   CLI   │  │  Web UI │  │  浏览器扩展 │  │  桌面端  │
                    └────┬────┘  └────┬────┘  └────┬─────┘  └────┬────┘
                         │            │   Native   │             │
                         │            │ Messaging  │ attach/embed│
                         │            │   发现     │             │
                         └────────────┴─────┬──────┴─────────────┘
                                            │
                                   ┌────────▼────────┐
                                   │  Cardo Runtime  │
                                   │ HTTP + stream   │
                                   │ Command 队列    │
                                   │ Query / History │
                                   └────────┬────────┘
                                            │
                                   ┌────────▼────────┐
                                   │  cardo.sqlite   │
                                   └─────────────────┘
```

设计支柱（入门见 [`docs/architecture/overview.md`](./docs/architecture/overview.md)；SoT：[`docs/architecture/local-runtime-multi-client.md`](./docs/architecture/local-runtime-multi-client.md)）：

1. Runtime 是业务写入的唯一权威
2. Zod 是 Command、IPC、设置、metadata 与协议的唯一运行时边界
3. Drizzle Schema 是关系持久化结构的唯一来源
4. UI / Zustand 只保存临时交互状态，禁止持久化完整 Workspace Snapshot
5. revision 扇出后，客户端按 InvalidationScope 重新执行 typed query

默认数据路径（可用 `CARDO_DATA_DIR` 覆盖）：

| 系统    | 路径                                               |
| ------- | -------------------------------------------------- |
| Windows | `%APPDATA%/cardo/cardo.sqlite`                     |
| macOS   | `~/Library/Application Support/cardo/cardo.sqlite` |
| Linux   | `${XDG_CONFIG_HOME:-~/.config}/cardo/cardo.sqlite` |

---

## 仓库结构

```text
src/
├── core/          领域、Zod 契约、Command/Query/History、Drizzle、ports
├── runtime/       HTTP 服务、锁、discovery、鉴权、事件、系统能力
├── client/        RuntimeClient（HTTP + fetch stream）
├── cli/           cardo serve | open | status | stop
├── web/           共享产品 UI（单一树；历史 web-next + web-v2 已合并）
│   ├── app/       CardoApp、start、stores、bootstrap、样式入口
│   ├── shell/     侧栏壳、设置 chrome、FeatureGate
│   ├── features/  盒子、画布、设置正文、条目、搜索…
│   ├── kit/       产品 UI kit（路径导入：kit/button、kit/icon…）
│   ├── domain/    纯展示 / 几何辅助
│   ├── styles/    产品 CSS + 主题 recipe
│   ├── themes/    Theme Pack apply / 注册表
│   ├── i18n/      en + zh 产品文案
│   └── platform/  RuntimeClient 宿主桥
├── web-runtime/   托管 UI 入口（Vite base /app/）
├── extension/     MV3 启动、Chrome 适配、Runtime 发现
├── desktop/       Electron main / preload / renderer attach-embed
└── native-host/   瘦 Native Messaging Host（discover + 可选 relay）

themes/builtin/    官方主题包（token JSON）
docs/              架构、路线图、UX 验收
assets/brand/      Logo、图标、lockup
artifacts/         构建产物（CLI、扩展、桌面、native-host、web-runtime）
```

---

## 环境要求

- 推荐 Node.js 22+（与工具链中的 `@types/node` 对齐）
- npm
- 当前 Desktop 打包路径面向 Windows（NSIS + 便携版）；electron-builder 已配置 macOS / Linux 目标
- 浏览器扩展与 Native Messaging 需要 Chrome 或 Edge

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 构建 CLI 与托管 Web UI

```bash
npm run cardo:build
```

### 3. 在浏览器中打开 Cardo

```bash
npm run cardo -- open
```

`cardo open` 在无健康 Runtime 时会拉起分离进程，再以一次性 code 完成 bootstrap（URL 不含长效 token）。

常用 CLI：

```bash
npm run cardo -- serve     # 前台 Runtime（阻塞至 Ctrl+C 或 stop）
npm run cardo -- status    # 健康 / 诊断
npm run cardo -- stop      # 强制停止
```

---

## 产品表面

### Web（本机主 UI）

Runtime 在健康后将 UI 托管在 `/app/`，通过 `cardo open` 打开。

### 浏览器扩展

```bash
npm run build
npm run native-host:install
npm run cardo -- open
```

1. 打开 Chrome / Edge → 扩展程序 → 加载已解压的扩展程序
2. 选择 `artifacts/extension/unpacked`
3. 点击工具栏图标（v1 主入口为独立扩展页）
4. 需要 Runtime 已运行，且 Native Host 已注册

### 桌面端

```bash
npm run desktop:start
```

若 Runtime 已在运行（例如 `cardo serve`），Desktop 走与 Web 相同的 HTTP + stream 路径 attach；否则 Main 在同一数据库路径上 embed Runtime。

打包 Windows 安装包：

```bash
npm run desktop:package
```

产物位于 `artifacts/desktop-dist/`。

### Native Messaging Host

```bash
npm run native-host:build
npm run native-host:install     # Chrome + Edge
npm run native-host:uninstall
```

Host 只读 discovery（并可可选中继），永不打开 SQLite。

---

## 开发脚本

| 命令                          | 说明                                                          |
| ----------------------------- | ------------------------------------------------------------- |
| `npm run dev`                 | 持续构建扩展到 `artifacts/extension/unpacked`                 |
| `npm run build`               | 停止本机实例并构建浏览器扩展                                  |
| `npm run cardo:build`         | 构建 CLI 与 Runtime 托管 Web UI                               |
| `npm run cardo -- open`       | 确保 Runtime 并打开 Web UI                                    |
| `npm run cardo -- serve`      | 前台 Cardo Runtime                                            |
| `npm run desktop:build`       | 构建 web-runtime 与 Electron main / preload / renderer        |
| `npm run desktop:start`       | 构建并启动桌面端                                              |
| `npm run desktop:package`     | Windows 安装版 + 便携版                                       |
| `npm run native-host:build`   | 构建 Native Messaging Host                                    |
| `npm run native-host:install` | 为 Chrome 和 Edge 注册 host                                   |
| `npm run build:all`           | 完整产品编译（扩展 + CLI + web-runtime + 桌面 + native-host） |
| `npm run check`               | TypeScript + ESLint + 测试                                    |
| `npm run test:ts`             | TypeScript 测试                                               |
| `npm run format`              | Prettier 格式化源码与 README                                  |
| `npm run clean`               | 删除生成产物                                                  |

本仓库在完成独立 Feature / Fix 后通常执行 `npm run build:all`，再单独提交并推送（见 `AGENTS.md`）。

---

## 主题包

官方主题位于 `themes/builtin/`：

| id         | 气质                     |
| ---------- | ------------------------ |
| `classic`  | 默认柔和玻璃壳           |
| `glass`    | 浮动半透明层             |
| `fluent`   | 接近 Windows 11 的实心壳 |
| `material` | Material 风格实心壳      |
| `swiftui`  | App 风格玻璃壳           |
| `codex`    | 侧栏壳 / 主面板方言      |

JSON 只放可序列化 token；结构方言 CSS 挂在 `[data-cardo-theme]` 下。制作说明见 `docs/architecture/theme-pack-authoring.md`。校验：

```bash
npx tsx scripts/validate-builtin-themes.ts
```

---

## 技术栈

| 层级         | 选型                                                         |
| ------------ | ------------------------------------------------------------ |
| 语言         | TypeScript                                                   |
| UI           | React 19、Motion、Radix 基础件、产品级 `src/web/kit`         |
| 样式         | Tailwind CSS 4、Design Token、主题 recipe                    |
| 契约         | Zod 4（类型用 `z.infer`）                                    |
| 持久化       | Drizzle ORM + SQLite                                         |
| Runtime 宿主 | Node HTTP（CLI serve / 分离子进程；Desktop attach 或 spawn） |
| 桌面壳       | Electron 42 + electron-builder                               |
| 扩展         | Manifest V3                                                  |
| 客户端传输   | RuntimeClient（HTTP + fetch ReadableStream）                 |
| UI 状态      | Zustand（仅临时状态）                                        |

---

## 文档

| 文档                                                                                                     | 主题                       |
| -------------------------------------------------------------------------------------------------------- | -------------------------- |
| [`docs/architecture/README.md`](./docs/architecture/README.md)                                           | 架构文档索引               |
| [`docs/architecture/overview.md`](./docs/architecture/overview.md)                                       | 贡献者总览                 |
| [`docs/architecture/local-runtime-multi-client.md`](./docs/architecture/local-runtime-multi-client.md)   | Runtime 拓扑、路径、硬决策 |
| [`docs/architecture/robustness-and-operations.md`](./docs/architecture/robustness-and-operations.md)     | 锁、日志、更新与恢复       |
| [`docs/architecture/ui-theme-system.md`](./docs/architecture/ui-theme-system.md)                         | 主题系统总览               |
| [`docs/architecture/theme-pack-authoring.md`](./docs/architecture/theme-pack-authoring.md)               | 官方 / 用户主题包写作      |
| [`docs/architecture/cardo-ui-system-paradigm.md`](./docs/architecture/cardo-ui-system-paradigm.md)       | 产品 UI 分层与 kit 规则    |
| [`docs/architecture/cardo-ui-kit.md`](./docs/architecture/cardo-ui-kit.md)                               | `src/web/kit` 公开 API     |
| [`docs/architecture/web-v2-codex-shell-design.md`](./docs/architecture/web-v2-codex-shell-design.md)     | 侧栏壳设计（cutover 完成） |
| [`docs/architecture/zod-drizzle-shadcn-refactor.md`](./docs/architecture/zod-drizzle-shadcn-refactor.md) | 契约与 UI 边界重构笔记     |
| [`docs/product-roadmap-v0.4.md`](./docs/product-roadmap-v0.4.md)                                         | 模板体系方向               |
| [`docs/product-roadmap-v0.5.md`](./docs/product-roadmap-v0.5.md)                                         | 书签 / 网址资产方向        |
| [`AGENTS.md`](./AGENTS.md)                                                                               | 贡献者架构约束             |
| [`assets/brand/README.md`](./assets/brand/README.md)                                                     | 品牌素材用法               |

---

## 路线图（产品方向）

Cardo 目前处于多客户端 Runtime 产品的早期阶段。近期规划包括：

- v0.4 — 更完整的模板体系（选择器、默认内容、Inbox 分流、Command Center 工作入口）
- v0.5 — 一等 Bookmark、浏览器收藏夹导入 / 导出、常用网址

路线图表达方向，不构成发版承诺。架构事实来源仍是本机 Runtime 多 Client 文档。

---

## CI 与发布

GitHub Actions 会在推送到 `main` 或向 `main` 提交 Pull Request 时执行格式检查、静态分析、测试以及 `build:all`。

推送稳定语义版本标签即可发布 Windows Desktop：

```powershell
git tag v0.1.0
git push origin v0.1.0
```

发布工作流只打包 Desktop（安装版、便携版与 SHA-256 校验文件）并上传到对应 GitHub Release。CLI 等其它入口计划后续通过 npm 分发。

---

## 参与贡献

1. 先阅读 `AGENTS.md`：单一 Runtime 写者、Zod / Drizzle SoT、禁止旧 schema 双读兼容。
2. UI 禁止直接导入 Drizzle 或执行业务写入。
3. 跨表面改动完成后优先 `npm run build:all`，再按 Feature / Fix 单独提交。
4. 跟随现有代码风格，避免无关大范围格式化。

欢迎通过本仓库 GitHub Issues 反馈缺陷与设计讨论。

---

## 许可证

MIT © KhaosBox contributors。详见 [`LICENSE`](./LICENSE)。

---

<p align="center">
  <img src="./assets/brand/cardo-mark-on-white.svg" alt="Cardo 标志" width="72"/>
</p>

<p align="center">
  <sub>Cardo — 本机工作区的门枢</sub>
</p>
