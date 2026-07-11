# KhaosBox 开发约束

1. 输出的 Markdown 内容未经允许禁止使用加粗。
2. 不运行测试，只执行用户指定的浏览器插件和桌面端构建。
3. 每个独立 Feature 或 Fix 完成后分别执行 `npm run build` 和 `npm run desktop:build`，单独提交并推送。
4. 项目禁止旧 Schema、旧字段、旧持久化格式和退休机制的兼容代码。

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
2. `ui/primitives` 保存 shadcn/Radix 基础源码，`ui/khaos` 保存产品级二次封装，业务组件只组合这些组件。
3. Canvas、Box Frame、Item Layout、Page Tab、Drag Overlay 和 Resize 保持产品专用结构。
4. Radix 管焦点、键盘、Portal 和可访问性；Motion 管连续空间动画；CSS 管颜色、边框和简单 hover；Drag Controller 独占拖拽根节点 transform。
5. 同一个 CSS 属性在同一状态下只能有一个动效所有者。
6. 拖拽和 Resize 帧内禁止提交 Command、写数据库或更新完整 Workspace。
7. 迁移组件时先复现当前视觉与几何，不在同一提交中主动重新设计。
8. 新实现落地后删除对应旧组件和旧 CSS，不长期保留双轨实现。
