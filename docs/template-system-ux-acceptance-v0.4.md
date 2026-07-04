# KhaosBox v0.4 模板体系 UX 验收清单

## 目标

本阶段用于验收 v0.4 模板体系是否已经从“创建空 box”升级为“按工作场景创建可用容器”。

当前模板体系应覆盖五条主路径：

1. 用户能从 Command Center 进入模板选择器。
2. 用户能在创建前理解每个模板适合什么场景。
3. 创建模板后自动生成合理的默认结构。
4. Inbox 中的项目能快速分流到目标 box 或具体看板列。
5. 创建完成后视图和默认卡片有明确焦点。

## 当前已落地范围

| 能力                     | 状态   | 验收点                                                                       |
| ------------------------ | ------ | ---------------------------------------------------------------------------- |
| Template Registry 产品化 | 已落地 | 模板定义集中管理名称、描述、推荐动作、默认尺寸、默认布局、默认状态、默认内容 |
| 模板选择器               | 已落地 | Command Center 加号打开可扫描模板选择器                                      |
| Inbox 分流增强           | 已落地 | 支持搜索目标、最近目标、Kanban 列目标和移动成功提示                          |
| Project Board            | 已落地 | 默认 Backlog、Doing、Review、Done 四列和 Project brief 卡片                  |
| Daily Desk               | 已落地 | 默认 Capture、Today、Waiting、Done 四列和两张引导卡片                        |
| 创建后首屏反馈           | 已落地 | 新 box 激活、置顶，并聚焦推荐默认卡片                                        |

## 模板验收标准

### Collection

- 模板选择器中显示 Collection。
- 描述应表达“收集混合资料”的用途。
- 创建后默认为 list 布局。
- 创建后不自动生成默认卡片。
- 适合链接、笔记、文件、文件夹混合收纳。

### Project Board

- 模板选择器中显示 Project Board。
- 描述应表达项目推进场景。
- 创建后默认为 list 布局的看板类 box。
- 默认列为 Backlog、Doing、Review、Done。
- 默认生成 Project brief 卡片。
- Project brief 应在 Backlog 列。
- Project brief 应为 pinned。
- 创建后应自动聚焦 Project brief。
- Inbox 分流目标中应出现 Project Board 的每一列。

### Daily Desk

- 模板选择器中显示 Daily Desk。
- 描述应表达当天工作台场景。
- 创建后默认为 list 布局的看板类 box。
- 默认列为 Capture、Today、Waiting、Done。
- 默认生成 Today's focus 和 Quick capture 两张卡片。
- Today's focus 应在 Today 列。
- Today's focus 应为 pinned。
- Quick capture 应在 Capture 列。
- 创建后应自动聚焦 Today's focus。
- Inbox 分流目标中应出现 Daily Desk 的每一列。

### Kanban

- 模板选择器中显示 Kanban。
- 默认列为 To do、Doing、Done。
- 创建后不自动生成默认卡片。
- 支持列新增、重命名、删除、移动。
- 支持卡片在列之间拖拽。

### Launcher

- 模板选择器中显示 Launcher。
- 创建后默认为 grid 布局。
- 创建后不自动生成默认卡片。
- 适合常用链接、文件和快捷方式入口。

### Inbox

- 模板选择器中显示 Inbox。
- 创建后默认为 list 布局。
- 创建后不自动生成默认卡片。
- Inbox 卡片底部显示分流入口。
- 无可分流目标时显示空目标状态。

## 关键用户路径验收

### 路径 1：从模板选择器创建 Project Board

1. 打开 Command Center。
2. 点击加号打开模板选择器。
3. 选择 Project Board。
4. 确认创建。

期望结果：

- 模板选择器关闭。
- 新 Project Board 出现在当前视口中心附近。
- 新 box 处于激活状态并位于最上层。
- 默认四列可见。
- Project brief 卡片可见并有短暂焦点高亮。

### 路径 2：从模板选择器创建 Daily Desk

1. 打开 Command Center。
2. 点击加号打开模板选择器。
3. 选择 Daily Desk。
4. 确认创建。

期望结果：

- 模板选择器关闭。
- 新 Daily Desk 出现在当前视口中心附近。
- 新 box 处于激活状态并位于最上层。
- Capture、Today、Waiting、Done 四列可见。
- Today's focus 卡片位于 Today 列并有短暂焦点高亮。
- Quick capture 卡片位于 Capture 列。

### 路径 3：Inbox 分流到看板列

1. 在 Inbox 中准备一个项目。
2. 打开该项目的分流入口。
3. 搜索 Project Board 或 Daily Desk。
4. 选择某个具体列。

期望结果：

- 项目移动到目标 box 的目标列。
- 目标 box 被激活并置顶。
- 被移动项目有短暂焦点高亮。
- 出现移动成功 toast。
- 该目标进入最近目标区。

### 路径 4：搜索和定位

1. 在 Command Center 搜索模板名、box 标题或项目内容。
2. 点击 box 结果。
3. 点击 item 结果。

期望结果：

- box 结果可按模板名和标题命中。
- item 结果可按标题、内容、所在 box 命中。
- 点击 box 后视口居中到对应 box。
- 点击 item 后视口居中到对应 box，并高亮对应 item。

## 回归验收清单

- [ ] Collection 创建后不出现默认卡片。
- [ ] Kanban 创建后仍只有 To do、Doing、Done。
- [ ] Launcher 创建后仍是 grid 布局。
- [ ] Inbox 创建后仍是 list 布局。
- [ ] Project Board 和 Daily Desk 不能切换 grid/list。
- [ ] 普通 box 仍可切换 grid/list。
- [ ] 删除 box 时对应 items 会被清理。
- [ ] 导入导出后 Project Board 和 Daily Desk 的列结构仍能保留。
- [ ] 旧工作区数据中的 Kanban 仍能按默认列 fallback。
- [ ] 达到 box 数量上限后不能继续创建模板。

## 技术验收命令

当前阶段建议至少跑：

```powershell
node scripts/run-prettier.mjs --check "src/**/*.{ts,tsx,css}" "scripts/**/*.ts" "README.md" "README_zh.md" "vite/*.ts" "eslint.config.js"
node_modules\.bin\tsc.cmd --noEmit
node_modules\.bin\tsx.cmd scripts\check-architecture.ts
node scripts/run-eslint.mjs .
node_modules\.bin\tsx.cmd --test "src/**/*.test.ts"
node_modules\.bin\vite.cmd build --config vite\extension.config.ts
node_modules\.bin\vite.cmd build --config vite\desktop-renderer.config.ts
node_modules\.bin\vite.cmd build --config vite\desktop-main.config.ts
node_modules\.bin\vite.cmd build --config vite\desktop-preload.config.ts
```

## 当前边界

- 最近分流目标目前是运行期状态，刷新后不保留。
- Project Board 和 Daily Desk 的默认卡片文案目前是固定英文内容。
- 还没有用户自定义模板、模板复制、模板导入导出或模板版本迁移策略。
- Reading List 和 Resource Hub 仍是候选模板，尚未落地。

## 下一阶段建议

v0.4-g 建议进入模板自定义预备：

1. 为模板定义增加版本字段。
2. 为默认内容增加可本地化的标题和内容 key。
3. 明确自定义模板与内置模板的边界。
4. 设计导入导出对自定义模板的兼容策略。
