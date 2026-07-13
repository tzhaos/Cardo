# Cardo 全面重构目标

| Field | Value |
| --- | --- |
| Status | Archived finished checklist (drifted from code) |
| Note | Active policy SoT is `AGENTS.md` + `docs/architecture/local-runtime-multi-client.md` |

## 最终目标

Cardo 采用一套明确且不可绕过的应用架构：

```text
UI / IPC
  -> Zod contract
  -> command registry
  -> Drizzle transaction
  -> operation log + history change set
  -> typed query functions
  -> React view model
```

通用 UI 以进入仓库的 shadcn/ui 源码为基础二次开发，保留 Radix 的焦点、键盘、Portal、锚定和可访问性能力，视觉、尺寸和动效完全由 Cardo Design System 定义。画布、拖拽、Resize、Box、Item 和 Page Tab 继续使用产品专用结构，不套用通用 Card 或 Tabs 外观。

重构完成后：

- Drizzle 表是持久化结构的唯一来源。
- Zod 是所有外部输入、命令、IPC、设置、JSON metadata 和导入导出格式的唯一运行时契约。
- 用户写操作只能通过 Command Registry 执行，并且一个用户动作只对应一个事务。
- 读取使用普通类型化 Query Function，不引入重型 Query Bus。
- Zustand 只保存菜单、选择、Rename、Drag Session 等短生命周期 UI 状态。
- 操作日志和撤销变更集与业务写入处于同一个事务。
- React 组件不能直接访问 Drizzle 表或修改业务实体。
- 拖拽帧内不能写数据库、提交 Command 或更新完整 Workspace。
- 不保留旧 Schema、旧字段或旧持久化机制的兼容代码。
- 不再持久化完整 Workspace Snapshot。
- 浏览器插件和桌面端共享 Contract、Command 和 Query 语义。

## 不采用的架构

- 不采用 Event Sourcing，数据库当前状态仍是事实来源。
- 不为每个查询建立 Query Class、Query Handler 和 Query Bus。
- 不建立只转发 Drizzle 的空壳 Repository 层。
- 不允许 UI 直接执行 Drizzle 查询或写入。
- 不在系统内部每一层重复执行 Zod parse。
- 不让 Radix、Motion、CSS 和拖拽控制器共同修改同一个 transform。
- 不长期保留新旧实现双轨运行。

## 数据边界

### Drizzle 持久化实体

- workspaces
- pages
- boxes
- items
- box_items
- collection_box_views
- preferences
- operation_log
- history_entries

### Zod Contract

- Workspace Command
- IPC request/response
- Import/export document
- Preferences
- Item metadata discriminated union
- History change set

### UI Store

- 当前菜单和 Popover
- 当前 Rename session
- Selection
- Drag/Resize session
- Pointer capture
- 临时 frame 和 drop preview
- 独立窗口位置
- 非持久化动画状态

## 命令执行契约

每个 Command Definition 包含：

- 稳定的 type
- Zod input schema
- 用户可见标题与关键词
- 是否可撤销
- execute 函数
- 受影响 Query key
- 命令面板元数据

统一执行器负责：

1. 在系统边界解析输入。
2. 打开 Drizzle transaction。
3. 执行业务规则和写入。
4. 捕获受影响数据的 before/after change set。
5. 写入 operation log。
6. 写入 history entry。
7. 提交事务。
8. 使受影响 Query 失效。

导航、后台 favicon 更新和纯系统约束必须显式标记为非撤销操作。

## 撤销契约

撤销系统保存事务级变更集，不保存完整 Workspace Snapshot。简单更新可以保存字段 before/after，删除和批量操作保存恢复所需的受影响行。Undo/Redo 由内部 History Engine 应用变更集，不递归生成新的普通历史记录。

## 查询契约

同一进程内使用普通函数：

- getPageTabs
- getActivePage
- getPageBoxes
- getBox
- getBoxItems
- getCollectionBoxes
- searchWorkspace
- getHistoryState
- getPreferences

只有跨 IPC 或插件进程的查询才定义 Zod request/response contract。组件只消费 Query Hook 或 View Model，不能了解表结构。

## UI 契约

组件分为三层：

```text
ui/primitives  shadcn/Radix 源码二次开发
ui/cardo       Cardo 产品级组件（shadcn/Radix 二次封装）
components     Page、Box、Item、Canvas 等业务组件
```

动效所有权：

- Radix 管交互状态、焦点、Portal 和可访问性。
- Motion 管弹簧、空间过渡和连续动画。
- CSS 管颜色、边框和简单 hover。
- Drag Controller 只管拖拽根节点 transform。

迁移的第一阶段以当前 UI 为视觉基准，不主动重新设计。完成基础迁移后再统一现有不一致之处。

## 迁移 Todo

### 0. 架构基线

- [x] 固化最终目标、边界、禁令和迁移顺序。
- [x] 在 AGENTS.md 中加入不可绕过的架构约束。
- [ ] 建立依赖方向检查和统一目录结构。

### 1. Zod 与 Drizzle 基础设施

- [ ] 引入 zod、drizzle-orm、drizzle-zod、drizzle-kit。
- [ ] 验证浏览器插件数据库 Worker 和持久化驱动。
- [ ] 建立桌面端数据库 adapter。
- [ ] 建立插件端数据库 adapter。
- [ ] 建立数据库初始化与严格版本检查。
- [ ] 禁止旧数据库和旧导出格式兼容。

### 2. 唯一 Schema

- [ ] 建立 workspace、page、box、item 和 placement 表。
- [ ] 建立 collection view、preferences 表。
- [ ] 建立 operation log、history entry 表。
- [ ] 从 Drizzle 派生 select/insert Zod schema。
- [ ] 建立 Item metadata discriminated union。
- [ ] 删除重复的 core/web-next 业务实体定义。

### 3. Command Registry

- [ ] 建立 Command Definition 和 Registry。
- [ ] 建立 Zod discriminated union。
- [ ] 建立事务执行器和 Command Context。
- [ ] 建立统一错误类型和执行结果。
- [ ] 建立 Query invalidation 契约。
- [ ] 接入操作日志和历史变更集。

### 4. 领域迁移

- [ ] 迁移 Page 创建、重命名、删除、排序、默认页。
- [ ] 迁移 Box 创建、删除、移动、跨页移动和 Resize。
- [ ] 迁移 Box 锁定、外观、视图和收藏。
- [ ] 迁移 Item 创建、编辑、删除、Pin 和排序。
- [ ] 迁移 Item 跨 Box 拖拽和全局粘贴。
- [ ] 迁移收藏页和回收站。
- [ ] 迁移设置、搜索、导入导出与同步。

### 5. 查询和渲染隔离

- [ ] 建立 Page、Box、Item、Search、History 查询函数。
- [ ] 建立细粒度 Query Hook。
- [ ] 移除 WorkspaceCanvas 对完整 Snapshot 的订阅。
- [ ] 移除 TopBar 对完整 Snapshot 的订阅。
- [ ] 保证 Item 修改只刷新所属 Box。
- [ ] 将 Zustand 限制为纯 UI Store。

### 6. 撤销与日志

- [ ] 使用数据库变更集替代 before/after Workspace Snapshot。
- [ ] 原子支持 Page、Box、Item 和批量操作撤销。
- [ ] 修正跨页拖拽的导航与落位历史语义。
- [ ] 日志与业务写入共享事务。
- [ ] 设置界面只保留日志导出入口。

### 7. IPC、导入导出

- [ ] 桌面 IPC 全部经过 Zod Contract。
- [x] 插件消息全部经过 Zod Contract。
- [x] 导入导出使用严格独立格式。

### 8. Cardo Design System

- [x] 建立 token、cn、Portal 和 z-index 契约。
- [x] 二次开发 Button、IconButton、Tooltip。
- [x] 二次开发 ContextMenu、DropdownMenu。
- [ ] 二次开发 Popover、Select、Toggle、Switch。
- [x] 二次开发 Input、Textarea、InlineRename。
- [ ] 二次开发 Dialog、AlertDialog、FloatingWindow。
- [x] 建立统一 motion token 和动效所有权。

### 9. UI 迁移

- [x] 迁移普通按钮、图标按钮和 Tooltip。
- [x] 迁移 Canvas、Box、Item、Page 右键菜单。
- [x] 迁移所有 Popover 和二级菜单。
- [x] 迁移 Page、Box、Item Rename。
- [x] 迁移设置、删除确认和导入导出界面。
- [ ] 迁移搜索与命令面板。
- [x] 迁移工具栏和 Item Actions。
- [x] 保持 Canvas、Box Frame、拖拽与 Resize 专用结构。

### 10. 清理与收口

- [x] 删除 Zustand Workspace persist。
- [x] 删除完整 Workspace Snapshot history。
- [x] 删除手写 codec、normalize 和兼容分支。
- [x] 删除重复 reducer、model 和 selector。
- [x] 删除被替代的旧 UI primitive 和 CSS。
- [x] 拆分单文件 app.css。
- [x] 完成插件和桌面端构建。
- [x] 审计每个业务写入口都经过 Command Registry。
- [x] 审计每个运行时边界都经过 Zod。
- [x] 审计 UI 不直接访问 Drizzle。

## 提交规则

每个独立 Feature 或 Fix：

1. 完成实现。
2. 执行 `npm run build`。
3. 执行 `npm run desktop:build`。
4. 不运行测试。
5. 创建单独提交。
6. 推送当前分支。
