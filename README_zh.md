[English](./README.md) | [中文](./README_zh.md)

<p align="center">
  <img src="./brand/khaosbox-logo-horizontal.svg" alt="KhaosBox logo" width="360" />
</p>

# KhaosBox

KhaosBox 会把浏览器新标签页变成一个桌面式工作区，你可以把链接、笔记、文件和文件夹放进可移动的 Box 中统一整理。它适合做快速收集、轻量归类，以及在不中断浏览流程的情况下快速重新打开内容。

项目以 Manifest V3 浏览器扩展形式提供，同时也带有一个基于 Vite 的 Web 预览环境，方便在扩展运行时之外开发和调试界面。

## 核心特性

- 桌面式工作区，支持 Box 拖拽、缩放、锁定、最小化
- 每个 Box 支持列表视图和网格视图
- 支持链接、笔记、文件、文件夹四类内容
- 支持 Box 之间拖放内容，并支持在 Box 内重排
- 智能粘贴：自动把 URL 和纯文本放到合适的位置
- 支持固定重要项目，让它们始终置顶
- 支持将工作区数据导出和导入为 JSON
- 选项页可配置新 Box 默认布局和本地资源启动行为
- 根据运行环境自动切换持久化方式：扩展内使用 `chrome.storage.local`，Web 预览使用 `localStorage`

## 使用方式

- 默认工作区会包含三个 Box：`Folders`、`Links`、`Notes`。
- 点击链接会在浏览器中打开对应地址。
- 点击笔记会把内容复制到剪贴板。
- 点击文件或文件夹会尝试通过自定义 `localexplorer:` 协议打开。
- 按 `Ctrl + \`` 可以一键最小化或恢复所有 Box。
- 粘贴文本时，URL 会优先进入 `Links`，普通文本会进入 `Notes`；如果当前有激活的 Box，则会优先放入该 Box。

> [!NOTE]
> 文件和文件夹的打开依赖系统中已经注册好的 `localexplorer:` 协议处理器。本仓库只负责触发这个协议，不包含本地处理程序本身。

## 技术栈

- React 19
- TypeScript 5
- Vite 6
- Tailwind CSS 4
- Zustand 状态持久化
- Motion 动画
- 面向 Chromium 浏览器的 Manifest V3 扩展架构

## 快速开始

### 前置条件

- Node.js
- npm

### 安装依赖

```bash
npm install
```

当前 MVP 版本不需要配置环境变量。

### 启动 Web 预览

```bash
npm run dev
```

然后打开 [http://localhost:3000](http://localhost:3000) 即可使用工作区的预览版本。

### 构建扩展

```bash
npm run build
```

构建产物会输出到 `dist/`，其中包括：

- `dist/manifest.json`
- `dist/extension/pages/newtab.html`

### 预览生产构建

```bash
npm run preview
```

## 以未打包扩展方式加载

1. 执行 `npm run build`。
2. 打开浏览器扩展管理页面：
   - Chrome：`chrome://extensions`
   - Edge：`edge://extensions`
3. 开启 **Developer mode**。
4. 点击 **Load unpacked**。
5. 选择仓库中的 [`dist`](./dist) 目录。

加载完成后，打开新标签页即可看到 KhaosBox 工作区。扩展选项页用于配置全局默认值，而日常编辑主要发生在新标签页工作区中。

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器，端口为 `3000` |
| `npm run build` | 构建预览页面和扩展资源到 `dist/` |
| `npm run build:extension` | 扩展构建的别名命令 |
| `npm run preview` | 本地预览构建后的产物 |
| `npm run clean` | 删除 `dist/` 目录 |
| `npm run lint` | 执行 TypeScript 类型检查，不生成输出文件 |

## 项目结构

```text
.
|-- brand/                 # Logo 与品牌素材
|-- extension/             # Manifest 与扩展专用 HTML 入口
|-- src/
|   |-- app/               # 应用壳层与启动入口
|   |-- domains/           # 核心模型、服务与 Zustand store
|   |-- features/          # 拖放、设置、托盘等用户功能
|   |-- platform/          # 存储、剪贴板、导航、本地桥接等平台适配
|   `-- widgets/           # 可复用 UI 组件
|-- index.html             # Web 预览入口
|-- vite.config.ts         # 同时构建预览页与扩展页的 Vite 配置
`-- dist/                  # 构建输出目录
```

## 架构说明

KhaosBox 把界面层与运行时差异做了清晰拆分：

- `src/domains` 负责工作区数据、条目创建、布局逻辑和持久化设置。
- `src/features` 负责 Box 拖放、添加项目、托盘交互、设置弹窗等用户流程。
- `src/platform` 会根据当前运行于扩展环境还是 Web 预览环境，切换存储和资源打开策略。

这种分层方式让我们可以先在本地快速迭代 UI，再把同一套核心应用逻辑放进扩展壳中发布。
