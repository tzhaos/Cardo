# KhaosBox

KhaosBox 是一个多宿主 TypeScript 工作区应用，用可移动的盒子整理链接、笔记、文件和文件夹。

## 宿主

- 浏览器扩展：Manifest V3 新标签页工作区。
- 桌面端：Electron 外壳，复用同一套 React 体验。
- CLI：基于 Node 的工作区迁移和检查工具。

## 架构

```text
src/
|-- core/       # 无运行时依赖的领域模型、编解码、迁移、协议、端口
|-- web/        # React UI、Zustand store、用例、功能控制层
|-- extension/  # MV3 启动入口、Chrome 适配器、后台桥接
|-- desktop/    # Electron main、preload、renderer、桌面适配器
`-- cli/        # Node CLI 入口
```

浏览器扩展和 Electron 桌面端都复用 `src/web`。平台能力通过 `src/core/ports` 注入。

## 本地资源

文件和文件夹使用 `kbe:` 协议。扩展发起 `kbe:` URL，Electron 桌面端注册为协议处理器，并通过 Electron shell 打开本地路径。

## 安装

```bash
npm install
```

## 常用脚本

| 命令                    | 说明                                          |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | 持续构建扩展到 `artifacts/extension/unpacked` |
| `npm run build`         | 构建浏览器扩展                                |
| `npm run desktop:build` | 构建 Electron renderer、main 和 preload       |
| `npm run desktop:start` | 构建并启动 Electron 桌面端                    |
| `npm run cli -- --help` | 查看 CLI 命令                                 |
| `npm run test:ts`       | 运行 TypeScript 测试                          |
| `npm run check`         | 运行 TypeScript、架构守卫、ESLint 和测试      |
| `npm run clean`         | 删除生成产物                                  |

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
