# KhaosBox

KhaosBox 是一个多宿主 TypeScript 工作区应用，用可移动的 box 管理链接、笔记、文件和文件夹。

## 宿主

- 浏览器扩展：Manifest V3 新标签页工作区。
- 桌面端：复用同一套 React 体验的 Electron shell。
- CLI：Node 命令行工作区迁移和检查工具。

## 架构

```text
src/
|-- core/       # 运行时无关的领域模型、编解码、迁移、协议和端口
|-- web/        # React UI、Zustand store、用例和功能控制器
|-- extension/  # MV3 启动入口、Chrome 适配器和扩展宿主
|-- desktop/    # Electron main、preload、renderer 和桌面适配器
|-- native-host/# 本地资源打开桥接
`-- cli/        # Node CLI 入口
```

浏览器扩展和 Electron 桌面端都复用 `src/web`。平台能力通过 `src/core/ports` 注入。

## 本地资源

文件和文件夹通过可选的 Native Messaging Host 打开。浏览器扩展向 `com.khaosbox.local_bridge` 发送 `open-local-resource` 消息，host 再调用系统文件管理器打开本地路径。Electron 桌面端通过自己的 preload IPC bridge 打开本地资源。

## 安装

```bash
npm install
```

## 开发脚本

| 命令                            | 说明                                          |
| ------------------------------- | --------------------------------------------- |
| `npm run dev`                   | 持续构建扩展到 `artifacts/extension/unpacked` |
| `npm run build`                 | 构建浏览器扩展                                |
| `npm run desktop:build`         | 构建 Electron renderer、main 和 preload       |
| `npm run desktop:start`         | 构建并启动 Electron 桌面端                    |
| `npm run native-host:build`     | 构建 Native Messaging Host exe                |
| `npm run native-host:install`   | 为 Chrome 和 Edge 注册 host                   |
| `npm run native-host:uninstall` | 取消注册 Native Messaging Host                |
| `npm run cli -- --help`         | 查看 CLI 命令                                 |
| `npm run test:ts`               | 运行 TypeScript 测试                          |
| `npm run check`                 | 运行 TypeScript、架构检查、ESLint 和测试      |
| `npm run clean`                 | 删除生成产物                                  |

## CLI

```bash
npm run cli -- migrate workspace.json
npm run cli -- inspect workspace.export-v3.json
```

## 浏览器扩展

```bash
npm run build
```

在 Chrome 或 Edge 中以未打包扩展加载 `artifacts/extension/unpacked`。

## 桌面端

```bash
npm run desktop:start
```

构建产物位于 `artifacts/desktop`。

## 文档

见 [`docs/architecture.md`](./docs/architecture.md)。
