# Cardo 改名清单

| Field | Value |
| --- | --- |
| Status | Complete — Path SoT cardo only; no previous-path relocate |
| Related | `docs/architecture/local-runtime-multi-client.md` |
| Scope | 产品标识、包名、Native Host、路径 SoT、Extension 入口 |

本清单记录 Cardo 命名与标识的既定决策与完成状态。禁止为旧产品名、旧 env 前缀、旧 preload 全局名、旧 transfer format、旧 system page id、旧磁盘路径做双读、shim 或 previous-install relocate。

## 1. 命名硬决策（已定）

| 项 | 决策 |
| --- | --- |
| 产品名 | Cardo（拉丁 cardo：门枢 / 枢纽） |
| CLI bin | 恒为 `cardo`（`cardo serve` / `cardo open` / `cardo status` / `cardo stop`） |
| npm package | `cardo`（`private: true`）；bin 名不变 |
| 仓库 | 当前本地路径/远程名可仍为历史仓库名；仓库改名另 PR |
| Path SoT | 目录 `cardo`，数据库 `cardo.sqlite`（`src/runtime/paths.ts`） |
| Extension 主入口 | 工具栏打开独立扩展页；newtab 非 v1 主入口 |

设计 SoT：`docs/architecture/local-runtime-multi-client.md`。

## 2. 产品矩阵（标识口径）

| 表面 | 角色 | 是否持有权威 SQLite |
| --- | --- | --- |
| Runtime | 状态 + 系统能力权威 | 是（唯一） |
| CLI | 入口：安装、serve、open web、status、stop | 否 |
| Web | 图形前端 client | 否 |
| Browser Extension | 图形/入口 client，连接 Runtime | 否 |
| Desktop | 图形壳 client；可 embed 或 attach Runtime | 否（库只在 Runtime 内） |

## 3. 标识落地（代码 SoT）

| 项 | 值 |
| --- | --- |
| `package.json` name / productName | `cardo` / `Cardo` |
| 环境变量 | `CARDO_*` |
| Vite define | `__CARDO_*` |
| Desktop preload bridge | `window.cardoDesktop` |
| AppUserModelId / setName | Desktop 使用 `cardo` userData 段 |
| Native host | `com.cardo.local_bridge`；产物 `cardo-native-host.exe` |
| Transfer format | `cardo-workspace` |
| System page ids | `cardo-collection` / `cardo-recycle-bin`（schema v5 单向改写） |
| 日志 / i18n / 错误串 | Cardo |
| UI 封装目录 `src/web-next/ui/khaos` | 产品组件目录名可后续视觉 PR 再改；不阻塞标识 SoT |
| 品牌文件 `assets/brand/cardo-*` | orbit mark + inverted-bar wordmark；扩展/托盘/Electron 图标同源 |

## 4. Path SoT

1. 权威路径：`resolveCardoDataPaths()` → `%APPDATA%/cardo/cardo.sqlite`（及 darwin/linux 等价路径）。
2. Desktop：`app.setName('cardo')` 后与 resolver 一致。
3. 仅使用 SoT 路径；无 previous-install 目录扫描、无跨路径 move/rename 库文件。
4. `CARDO_DATA_DIR` 可覆盖数据目录；仍只打开该目录下的 `cardo.sqlite`。
5. 开发用 drizzle：`./artifacts/development/cardo.sqlite`。

## 5. Schema

| 版本 | 内容 |
| --- | --- |
| 0 | 空库 |
| 3 | baseline business tables |
| 4 | `runtime_meta` |
| 5 | system page ids → `cardo-collection` / `cardo-recycle-bin` |

仅单向 N→N+1；无旧 id 双读。

## 6. 明确不做

1. 不为旧包名、旧 NM host 名、旧 preload 全局名、旧 env 前缀、旧 transfer format 做双读。
2. 不自动双向合并任何第二本地库与 Runtime。
3. 不把完整 Workspace Snapshot 当同步协议。
4. 不做 previous-install 磁盘路径 relocate（Path SoT 仅 `cardo` / `cardo.sqlite`）。
