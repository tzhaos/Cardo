# Cardo

Cardo 是一个多宿主 TypeScript 空间工作台，用自由卡片式 box 管理链接、笔记、文件、文件夹、网站收藏和常用启动入口。

产品方向为 Cardo：本机唯一 Runtime 持有 SQLite 与业务写入；Web、Desktop 与浏览器扩展均为该 Runtime 的客户端。详见 `docs/architecture/local-runtime-multi-client.md`。

## 宿主

- Cardo Runtime：工作区唯一权威（CLI `cardo serve` / `cardo open`，或 Desktop embed）。
- Web UI：由 Runtime 托管在 `/app/`（通过 `cardo open` 打开）。
- 浏览器扩展：Manifest V3 客户端；工具栏打开扩展页，经 Native Messaging 发现 Runtime。
- 桌面端：Electron 壳；优先 attach，缺失则 embed；与 Web 同一 RuntimeClient 路径。

## 架构

```text
src/
|-- core/       # 领域、契约、Command/Query/History、migrator
|-- runtime/    # Cardo Runtime HTTP、锁、discovery、事件
|-- client/     # RuntimeClient（HTTP + fetch stream）
|-- cli/        # cardo serve / open / status / stop
|-- web-next/   # React UI、空间工作区与平台接入
|-- extension/  # MV3 启动、Chrome 适配、Runtime 发现
|-- desktop/    # Electron main、preload、renderer、attach/embed
`-- native-host/# 瘦 Native Messaging Host（discover + 可选 relay）
```

各图形表面复用 `src/web-next`，经 `RuntimeClient` 访问 Runtime。非 DB 壳能力仍在 `src/core/ports`。

## Cardo CLI

构建 CLI 与托管 Web UI：

```bash
npm run cardo:build
```

常用命令（构建后；bin 为 `cardo`）：

```bash
# 确保 Runtime 可用并打开 Web UI（一次性 code bootstrap，URL 不含长效 token）
npm run cardo -- open

# 前台 Runtime（阻塞至 Ctrl+C 或 cardo stop）
npm run cardo -- serve

# 健康 / 诊断
npm run cardo -- status

# 强制停止
npm run cardo -- stop
```

`cardo open` 在无健康 Runtime 时会拉起分离进程，再打开浏览器。当前活动页面与全局撤销栈在所有已连接客户端之间共享。

## 本地资源与 Native Messaging

扩展通过瘦 Native Messaging Host 发现 Runtime（`npm run native-host:install` 注册 Chrome/Edge，或 Desktop 安装）。本地路径经 Runtime capability 打开，不会成为第二写库。

## 安装

```bash
npm install
```

## 开发脚本

| 命令                            | 说明                                             |
| ------------------------------- | ------------------------------------------------ |
| `npm run dev`                   | 持续构建扩展到 `artifacts/extension/unpacked`    |
| `npm run build`                 | 构建浏览器扩展                                   |
| `npm run cardo:build`           | 构建 CLI 与 Runtime 托管 Web UI                  |
| `npm run cardo -- open`         | 确保 Runtime 并打开 Web UI                       |
| `npm run cardo -- serve`        | 前台 Cardo Runtime                               |
| `npm run desktop:build`         | 构建 web-runtime、Electron renderer/main/preload |
| `npm run desktop:start`         | 构建并启动 Electron 桌面端                       |
| `npm run native-host:build`     | 构建 Native Messaging Host exe                   |
| `npm run native-host:install`   | 为 Chrome 和 Edge 注册 host                      |
| `npm run native-host:uninstall` | 取消注册 Native Messaging Host                   |
| `npm run test:ts`               | 运行 TypeScript 测试                             |
| `npm run check`                 | 运行 TypeScript、架构检查、ESLint 和测试         |
| `npm run clean`                 | 删除生成产物                                     |

## 浏览器扩展

```bash
npm run build
npm run native-host:install
npm run cardo -- open
```

在 Chrome 或 Edge 中以未打包扩展加载 `artifacts/extension/unpacked`。v1 主入口为工具栏打开的扩展页。需 Runtime 在跑且 Native Host 已注册。

## 桌面端

```bash
npm run desktop:start
```

构建产物位于 `artifacts/desktop`。若 Runtime 已在运行（例如 `cardo serve`），Desktop 仅 attach；否则 Main embed 同一库路径的 Runtime。

## CI 与发布

GitHub Actions 会在推送到 `main` 或向 `main` 提交 Pull Request 时执行格式、静态检查、测试，
并验证浏览器扩展、桌面端和 Native Messaging Host 的构建。

推送稳定语义版本标签即可发布 Windows 版本：

```powershell
git tag v0.1.0
git push origin v0.1.0
```

发布工作流会将扩展压缩包、Native Messaging Host、桌面安装版、便携版和 SHA-256 校验文件
上传到对应的 GitHub Release。
