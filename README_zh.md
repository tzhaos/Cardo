[English](./README.md) | [中文](./README_zh.md)

<p align="center">
  <img src="./assets/brand/khaosbox-logo-horizontal.svg" alt="KhaosBox logo" width="360" />
</p>

# KhaosBox

KhaosBox 是一个 Manifest V3 浏览器插件，它把新标签页变成一个可拖拽的桌面式工作区，用来整理链接、笔记、文件和文件夹。

## 功能特点

- 可拖拽、可缩放、可锁定、可最小化的 Box
- 每个 Box 支持列表和网格两种布局
- 支持链接、笔记、文件、文件夹四类内容
- 支持 Box 间拖放和 Box 内重排
- 智能粘贴：自动识别 URL、纯文本、Windows 路径、UNC 路径和 `file://` URI
- 每个 Box 独立主题，全局明暗主题，中英文界面切换
- 工作区 JSON 导入导出
- 在插件环境内使用 `chrome.storage.local` 持久化

## 本地资源与 KBE

点击文件或文件夹时，KhaosBox 会发送一个 `kbe:` 请求。Windows 上这个请求由仓库内附带的 KhaosBox Companion 处理：

- 文件夹在资源管理器中打开
- 文件使用系统默认关联应用打开

如果没有安装 Companion，插件仍会发起请求，但 Windows 不会知道如何处理它。

## 快速开始

### 前置条件

- Node.js
- npm
- 如果需要构建或测试 Windows Companion，还需要安装 .NET SDK 9.x

### 安装依赖

```bash
npm install
```

### 构建插件

```bash
npm run build
```

构建产物会输出到 `artifacts/extension/unpacked`。

### 开发时持续构建插件

```bash
npm run dev
```

这个命令会执行 `vite build --watch`，持续更新 `artifacts/extension/unpacked`，适合配合浏览器的 unpacked extension 工作流使用。

### 以未打包扩展方式加载

1. 执行 `npm run build`
2. 打开浏览器扩展管理页
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. 开启 **Developer mode**
4. 点击 **Load unpacked**
5. 选择仓库里的 [`artifacts/extension/unpacked`](./artifacts/extension/unpacked) 目录

加载后，打开新标签页即可看到 KhaosBox 工作区。

## Windows Companion

构建 Windows Companion：

```bash
npm run companion:windows:build
```

发布到 `artifacts/companion/windows/publish/win-x64`：

```bash
npm run companion:windows:publish
```

为当前用户安装 Companion：

```bash
npm run companion:windows:install
```

卸载 Companion：

```bash
npm run companion:windows:uninstall
```

构建 Windows `.msi` 安装包：

```bash
npm run companion:windows:msi
```

生成文件位于：

- `artifacts/companion/windows/packages/KhaosBoxCompanion-win-x64.msi`

更多说明见 [`companion/windows/README.zh-CN.md`](./companion/windows/README.zh-CN.md)。

## 常用脚本

| 命令                                  | 说明                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`                         | 持续构建插件到 `artifacts/extension/unpacked`                           |
| `npm run build`                       | 构建浏览器插件到 `artifacts/extension/unpacked`                         |
| `npm run companion:windows:build`     | 构建 Windows Companion                                                  |
| `npm run companion:windows:publish`   | 发布 Windows Companion 到 `artifacts/companion/windows/publish/win-x64` |
| `npm run companion:windows:install`   | 为当前用户发布并注册 Windows Companion                                  |
| `npm run companion:windows:uninstall` | 删除 Windows Companion 的注册和安装文件                                 |
| `npm run companion:windows:msi`       | 构建 Windows Companion 的 MSI 安装包                                    |
| `npm run clean`                       | 删除所有生成产物和遗留的本地构建目录                                    |
| `npm run lint`                        | 执行 `tsc --noEmit` 与架构依赖守卫                                      |
| `npm run lint:eslint`                 | 执行 ESLint（类型感知规则，需先 `npm install`）                         |
| `npm run format`                      | 使用 Prettier 格式化 `src/`、`scripts/`、`docs/` 等                     |
| `npm run format:check`                | 检查 Prettier 格式（CI 使用）                                           |
| `npm run check`                       | `lint` + `lint:eslint` + `test:ts`                                      |
| `npm run test:ts`                     | 执行 TypeScript 测试                                                    |
| `npm test`                            | 执行 TypeScript 与 Windows Companion 测试                               |

根目录 **`build.ps1 -RunChecks`** 会执行 **`npm run check`**，并在未跳过 Companion 时执行 **`dotnet test`**。GitHub 工作流见 `.github/workflows/ci.yml`。

### npm install / ESLint 报错

若 `npm install` 立刻失败，或 `npm run lint:eslint` 提示未安装 ESLint：说明依赖未装全。

**先确认是不是连不上 registry**：在项目根执行 `npm run doctor:registry`（会用当前 `npm config get registry` 测一次 `@eslint/js` 的包元数据请求）。若这里就报错，属于 **网络 / 代理 / TLS / 公司防火墙** 问题，需要先让本机能稳定访问 registry，而不是改业务代码。

打开 npm 写的日志（路径会在失败提示里给出），在 PowerShell 里可用：

```powershell
Get-ChildItem "$env:LOCALAPPDATA\npm-cache\_logs" | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | ForEach-Object { Get-Content $_.FullName }
```

若日志里在 `fetch manifest` / `cache-miss` 之后立刻 `exit 1`，与「装到一半报错」不同，多半是 **registry 请求失败**（控制台有时不打印细节）。可尝试：`npm cache clean --force`；检查 `npm config get proxy` / `https-proxy`；必要时换镜像（例如 `npm config set registry https://registry.npmmirror.com`）后再 `npm install`。Node 24 + npm 11 若在个别环境异常，可换 **Node 22 LTS** 再试。

若 `package.json` 已增加新开发依赖而 `package-lock.json` 仍是旧版本，可在 **registry 已能访问** 的前提下删除 `node_modules` 与 `package-lock.json` 后重新 `npm install` 生成新锁文件（提交前请审查 `.lock` 差异）。

## 项目结构

```text
.
|-- artifacts/            # 所有生成产物：插件、发布、安装包、bin/obj
|-- assets/
|   |-- brand/            # Logo 与品牌资源
|   `-- extension-shell/  # Manifest、语言包、图标和扩展入口
|-- companion/            # Windows Companion 的源码、脚本、打包文件和文档
|-- docs/                 # 架构与工程设计文档（如 `architecture.md`）
|-- scripts/              # 架构检查、迁移等仓库级脚本
|-- src/
|   |-- app/              # 应用启动、Store、端口与用例层
|   |-- domains/          # 纯领域模型与无 UI 业务逻辑
|   |-- extension/        # 浏览器扩展宿主能力
|   |-- features/         # 拖拽、托盘等用户功能
|   |-- integrations/     # 外部集成，如 Windows Companion
|   `-- widgets/          # 可复用 UI 组件
`-- vite.config.ts        # 插件构建配置
```

## 架构说明

分层、端口与质量门禁的说明见 [`docs/architecture.md`](./docs/architecture.md)（英文）。

- `src/domains` 负责工作区数据、条目创建、布局逻辑、导入导出等纯逻辑与编解码。
- `assets/extension-shell` 负责浏览器插件壳层输入文件，并在构建时复制到 unpacked extension。
- `assets/brand` 负责可复用的品牌资源，与插件壳层输入分开管理。
- `src/extension` 负责浏览器扩展宿主能力，例如 tabs 和 storage。
- `src/integrations/companion` 负责 `kbe:` 协议请求边界。
- `src/app/use-cases/openItem.ts` 是打开链接、笔记、文件和文件夹的统一入口。
