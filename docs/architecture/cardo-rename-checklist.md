# Cardo 改名清单

| Field | Value |
| --- | --- |
| Status | Actionable checklist |
| Related | `docs/architecture/local-runtime-multi-client.md` |
| Scope | 产品标识、包名、Native Host、路径政策、Extension 入口；非本 PR 改代码 |

本清单固化 KhaosBox → Cardo 的命名与标识工作项。PR0 只提交文档；实际改代码按阶段拆 PR，路径搬迁必须在产品 rename 之后单独做。

## 1. 命名硬决策（已定）

| 项 | 决策 |
| --- | --- |
| 产品名 | Cardo（拉丁 cardo：门枢 / 枢纽） |
| CLI bin | 恒为 `cardo`（`cardo serve` / `cardo open` / `cardo status` / `cardo stop`） |
| npm package | 优先注册 `cardo`；若名被占用则 `@cardo/cli`（或同类 scope）；bin 名不变 |
| 仓库 | 当前仍为 KhaosBox 路径/远程；仓库改名另 PR，不与 Runtime 功能 PR 混做 |
| SQLite v1 | 迁移完成前保持 `khaosbox.sqlite` 与今日 Desktop 同路径（见 §4） |
| Extension 主入口 | 工具栏打开独立扩展页；newtab 非 v1 主入口 |

设计 SoT：`docs/architecture/local-runtime-multi-client.md` §2、§2.1、Hard Decisions 1/10/26。

## 2. 产品矩阵（标识口径）

改名后对外与文档统一使用下列角色；禁止继续把 Extension 或 Desktop 描述为「权威写库端」。

| 表面 | 角色 | 是否持有权威 SQLite |
| --- | --- | --- |
| Runtime | 状态 + 系统能力权威 | 是（唯一） |
| CLI | 入口：安装、serve、open web、status、stop | 否 |
| Web | 图形前端 client | 否 |
| Browser Extension | 图形/入口 client，连接 Runtime | 否（禁止长期权威写库） |
| Desktop | 图形壳 client；可 embed 或 attach Runtime | 否（库只在 Runtime 内） |

## 3. 改名工作项（按面拆分）

### 3.1 package / monorepo 元数据

| 当前 | 目标 | 备注 |
| --- | --- | --- |
| `package.json` `name`: `khaosbox` | 优先 `cardo`；冲突则私有 monorepo 根名与 publish 包分离，publish 的 CLI 用 `cardo` 或 `@cardo/cli` | 根包若 `private: true` 可先改 display 名，publish 策略另定 |
| `package.json` `productName`: `KhaosBox` | `Cardo` | Electron / electron-builder 显示名与 userData 相关；改 productName 会改变默认 userData 目录 → 触发路径问题，须与 §4 同步规划 |
| `package-lock.json` name | 随 package.json | 改名 PR 一并 regenerate |
| `bin` 字段（未来 CLI 包） | `cardo` → CLI 入口 | bin 永不因 scope 包名而改成非 `cardo` |
| 环境变量前缀 `KHAOSBOX_*` | `CARDO_*`（如 `CARDO_DEBUG_PACKAGE`、`CARDO_DESKTOP_PRODUCT_NAME`、`CARDO_USE_RUNTIME`） | 设计文档已用 `CARDO_USE_RUNTIME`；禁止长期双前缀兼容 |
| Vite define `__KHAOSBOX_*` | `__CARDO_*` | 与 env 同步改；无旧 define 双读 |

### 3.2 Desktop 标识

| 当前 | 目标 | 文件 / 位置提示 |
| --- | --- | --- |
| 窗口 title / tray tooltip `KhaosBox` | `Cardo` | `src/desktop/main.ts` |
| 托盘菜单「显示/隐藏 KhaosBox」 | Cardo 文案 | 同上 |
| `app.setAppUserModelId('com.khaosbox.desktop')` | `com.cardo.desktop`（或最终选定 reverse-DNS） | 改 ID 影响 Windows 通知分组；可与 product rename 同 PR |
| `window.khaosboxDesktop` preload bridge | `window.cardoDesktop`（或 `cardo`） | `preload.ts` / `bridge.ts`；改名时直接替换，不保留旧全局名 shim |
| `User-Agent: KhaosBox/1.0` | `Cardo/1.0` | desktop main fetch headers |
| Debug 窗口标题 / 日志前缀 | Cardo | main / log |
| `scripts/write-desktop-app-package.ts` 默认 productName | Cardo | 与 env 覆盖一致 |
| `assets/desktop-shell/index.html` title | Cardo | 壳 HTML |
| electron-builder 产出 `KhaosBox Setup *.exe` | Cardo 安装包名 | `scripts/build-pipeline.ts` 期望路径 |

### 3.3 Native Messaging host

| 当前 | 目标 | 备注 |
| --- | --- | --- |
| `KHAOSBOX_NATIVE_HOST_NAME = 'com.khaosbox.local_bridge'` | 例如 `com.cardo.local_bridge` 或 `com.cardo.native_host` | `src/core/protocols/nativeMessaging.ts`；常量名改为 `CARDO_NATIVE_HOST_NAME` |
| 注册表 / 清单路径 `...NativeMessagingHosts\com.khaosbox.local_bridge` | Cardo host 名 | `scripts/install-native-host.ts`、`uninstall-native-host.ts` |
| 产物 `khaosbox-native-host.exe` | `cardo-native-host.exe` | `package-native-host.ts` / build-pipeline |
| manifest description `KhaosBox local resource bridge` | Cardo 描述 | install 脚本写入的 NM manifest |
| 扩展发现逻辑中的 `khaosbox` / `KhaosBox` 路径与 telemetry 匹配 | 更新为 Cardo；安装脚本可同时扫描历史扩展 id 仅用于迁移安装，不在运行时双协议 | 禁止长期双 host 名并行权威 |

Runtime 多 client 后 NM 职责见设计文档：discover + optional relay，永不写 SQLite。host 名变更后须重新 `native-host:install` 并更新 Extension 侧 `chrome.runtime.connectNative` 目标名。

### 3.4 Extension 标识与入口

| 当前 | 目标 | 备注 |
| --- | --- | --- |
| `_locales` / `vite/extension-locales.ts` extensionName/ShortName `KhaosBox` | Cardo | 中英文案同步 |
| extension description | 反映 Runtime client 角色，而非独立权威库 | 文案随 PR5/PR7 可再收紧 |
| `chrome_url_overrides.newtab` 为主入口 | v1 主入口改为工具栏打开独立扩展页（如 `pages/app.html`） | newtab 非 v1 主入口；可不实现或非默认 |
| host_permissions | 连接 Runtime 时需允许 loopback（`http://127.0.0.1/*` 等，按实现收紧） | 与 CORS/设计 §6.4.2 对齐；改权限时走单独安全评审 |
| `permissions`: `nativeMessaging` | 保留；目标 host 名随 §3.3 | connectNative 名更新 |
| OPFS 文件名 `khaosbox.sqlite` | v1 不改文件名作兼容；PR5 后 OPFS 写硬禁用 | 不自动合并进 Runtime（§4） |
| 品牌图标 `assets/brand/khaosbox-*` | 后续视觉 PR 换 Cardo 资产；可暂留文件名 | 标识文案优先于画资产 |

### 3.5 源码与日志中的产品字符串

| 类别 | 当前示例 | 处理 |
| --- | --- | --- |
| 错误信息 | `KhaosBox app state is not initialized.` | 改为 Cardo（command handlers 等） |
| 日志前缀 | `console.*('[KhaosBox]', ...)` | `[Cardo]`（`src/core/log.ts`） |
| i18n UI 字符串 | messages 中产品名 | 统一 Cardo |
| README / README_zh | KhaosBox 叙述 | 产品 rename PR 或文档 PR 更新；说明 CLI/Web/Extension/Desktop client 矩阵 |
| `docs/product-roadmap-*` 等历史文档 | 可保留历史标题或加注「原 KhaosBox」 | 不强制全文改写历史 roadmap |

### 3.6 仓库与远程（稍后）

| 项 | 政策 |
| --- | --- |
| 本地路径 `D:\Workspace\KhaosBox` / worktree 名 | 仓库 rename 另 PR；不阻塞 Runtime 实现 |
| GitHub/远程仓库名 | 另 PR；与 npm 名、文档链接一并更新 |
| Clone URL、CI、徽章 | 随远程改名 |

不要把「仓库改名」和「Runtime HTTP 落地」绑在同一 PR。

## 4. 路径与数据连续性（禁止与 rename 混做）

Agents 禁止旧 schema/字段双读 shim；「改路径导致用户数据消失」是数据丢失，不是双读，必须显式策略。

### 4.1 v1（Runtime 上线阶段）Hard Decision

1. 权威 SQLite 文件名保持 `khaosbox.sqlite`（或当前 Desktop 实际文件名）。
2. Desktop 今日路径：`path.join(app.getPath('userData'), 'khaosbox.sqlite')`。productName 仍为 KhaosBox 期间，userData 目录与文件名不变。
3. CLI 与 Desktop 共用同一 path resolver（如 `resolveCardoDataPaths()`），rename 完成前必须解析到与 Desktop 相同的 userData/AppData 与同一 sqlite 文件。
4. 禁止 CLI 默认写 `%APPDATA%/Cardo/cardo.sqlite` 而 Desktop 仍写旧路径。
5. Extension OPFS `khaosbox.sqlite`：v1 不自动合并；PR5 后 OPFS 写禁用；用户保留数据靠导出 JSON → `workspace.import`。

### 4.2 路径搬迁 PR（产品/仓库 rename 之后，单独 PR）

1. 一次性 move/copy `khaosbox.sqlite` → Cardo 新路径。
2. 写 marker「已搬迁」；之后只打开新路径。
3. 不是双读：marker 存在后忽略旧路径。
4. 不与 productName / AppUserModelId / 包名 rename 同一 PR（避免半迁移状态）。
5. 同步更新 path resolver、discovery/lock 目录、文档。

### 4.3 开发用路径

| 当前 | 备注 |
| --- | --- |
| `drizzle.config.ts` → `./artifacts/development/khaosbox.sqlite` | v1 可保持；路径搬迁 PR 再改 |
| native-host diagnostics 目录 `LOCALAPPDATA/KhaosBox` / `~/.khaosbox` | 与 path resolver 对齐时一并改；避免第三套目录 |

## 5. Extension 独立页入口（产品入口政策）

与设计文档 Hard Decision 26 / §6.4 一致，改名与入口调整时遵守：

1. v1 主入口：工具栏 action 打开独立扩展页（扩展 page URL，加载 web-next client）。
2. newtab override 不是 v1 主入口（可不实现或非默认）。
3. side panel 非 v1 必需。
4. 数据面一律 Runtime client（PR5 起）；PR5 前 OPFS solo 不得对外宣传为与 Desktop 同一 workspace。
5. Runtime 不可用时 UI 引导启动 Cardo（CLI 或 Desktop）并安装 Native Host；不静默第二权威库。

实现落点提示（后续 PR，非 PR0）：`assets/extension-shell/manifest.json` action/page、去掉或降级 `chrome_url_overrides.newtab`、background 打开 `pages/app.html`（或等价）。

## 6. 建议执行顺序（跨 PR）

| 顺序 | 工作 | 与路径关系 |
| --- | --- | --- |
| A | 文档与 Agents 过渡注记（本 PR0） | 无 |
| B | Runtime / CLI / client 功能 PR（设计 Rollout PR1–PR7） | v1 保持 `khaosbox.sqlite` 同路径 |
| C | 产品显示名、i18n、错误串、日志前缀、扩展 locales（低风险标识） | 尽量不改 productName/userData |
| D | package name、CLI bin 发布、`CARDO_*` env、Native Host 名、AppUserModelId、preload 全局名 | 评估 userData；仍指向旧 sqlite 路径 |
| E | productName / electron userData 目录变更 | 必须紧接或合并规划 F |
| F | 路径搬迁 PR：move sqlite + marker + resolver 只认新路径 | rename 完成后单独 PR |
| G | 仓库/远程改名 | 任意较后；不阻塞 B |

## 7. 明确不做

1. 不为旧包名、旧 NM host 名、旧 preload 全局名、旧 env 前缀做长期双读兼容层。
2. 不在 rename PR 内实现 Runtime 协议或改 schema。
3. 不自动双向合并 Extension OPFS 与 Desktop 文件库。
4. 不把完整 Workspace Snapshot 当同步或迁移协议。
5. 本清单不要求 PR0 修改任何运行时代码。

## 8. PR0 完成定义

- [x] `docs/architecture/local-runtime-multi-client.md` 纳入版本库（Cardo 多 client 设计 SoT）
- [x] 本改名清单可执行
- [x] `Agents.md`（`AGENTS.md`）含过渡注记，指向设计文档与目标架构，禁止把 OPFS 权威写 / Desktop raw SQL IPC 当长期设计
- [ ] 实际标识与路径代码变更：后续 PR 按 §6 执行
