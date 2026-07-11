# Cardo v0.5 产品规划：网站收藏与常用网址

## 定位

v0.5 的目标是把 Cardo 从“空间化资料与任务容器”推进到“个人网址资产管理”。用户不仅能把链接丢进 box，还能系统地收藏、导入、整理、搜索、打开、导出和沉淀常用网站。

v0.5 不应该只是给 URL item 增加收藏按钮。它要回答三个问题：

1. 我从浏览器带来的大量收藏夹如何进入 Cardo
2. 我每天反复打开的网站如何自然浮现
3. 我整理好的网址资产如何再导回浏览器或迁移出去

## 核心目标

1. 建立 Bookmark 作为一等数据域
2. 支持导入浏览器收藏夹
3. 支持导出浏览器可识别的收藏夹文件
4. 支持常用网址自动沉淀和手动固定
5. 让网址收藏能进入现有 box、模板、Command Center 和 Launcher 工作流

## 产品原则

网址收藏不是普通 URL item 的重复包装，而是有生命周期的资产：

1. 来源：手动添加、浏览器导入、从现有 URL item 转入
2. 组织：文件夹、标签、box、常用、固定
3. 使用：搜索、打开、统计、最近访问
4. 迁移：导出、备份、跨浏览器恢复

默认策略应该偏保守。导入大量收藏夹时，不应该把桌面铺满 box，也不应该强行改变用户已有工作区结构。

## 关键能力

### 网站收藏

新增 Bookmark 数据域，用于承载网站收藏。

建议字段：

1. id
2. title
3. url
4. normalizedUrl
5. description
6. tags
7. folderId
8. source
9. createdAt
10. updatedAt
11. lastOpenedAt
12. openCount
13. isFavorite
14. isPinned

Bookmark 与现有 URL item 的关系：

1. URL item 是放在 box 里的工作卡片
2. Bookmark 是全局网址资产
3. 一个 URL item 可以关联一个 bookmarkId
4. 一个 Bookmark 可以被添加到多个 box
5. 删除 box 不应默认删除 Bookmark

### 浏览器收藏夹导入

导入能力分两层：

1. 文件导入：支持浏览器导出的书签 HTML 文件
2. 浏览器直连导入：扩展端可在授权后读取浏览器书签树

导入后的默认行为：

1. 保留收藏夹文件夹结构
2. 按 URL 去重
3. 标记导入来源
4. 生成导入报告
5. 不自动创建大量桌面 box

导入报告至少包含：

1. 新增数量
2. 跳过重复数量
3. 无效 URL 数量
4. 导入来源
5. 可选的“创建 Web Library box”动作

### 收藏夹导出

导出目标：

1. 浏览器可导入的书签 HTML 文件
2. Cardo JSON 备份中的 Bookmark 数据

导出范围：

1. 全部收藏
2. 某个文件夹
3. 某个标签
4. 当前 box 中关联的收藏
5. 常用网址

导出时应保留：

1. 标题
2. URL
3. 文件夹结构
4. 创建时间

Cardo 内部字段如 openCount、isPinned、tags 可以保留在 JSON 备份，不强行塞进浏览器书签 HTML。

### 常用网址

常用网址是“使用行为”和“手动固定”的结合，不只是一个静态列表。

常用网址来源：

1. 手动固定
2. 打开次数
3. 最近打开
4. 从 Launcher 或 Command Center 打开
5. 从 URL item 打开

排序建议：

1. 手动固定优先
2. 最近使用优先
3. 高频使用加权
4. 已归档或失效 URL 降权

用户可见入口：

1. Command Center 的常用网址分区
2. Launcher 模板中的常用网址区域
3. 新增 Frequent Sites / 常用网址模板
4. 空白新标签页的快速入口

## 新模板建议

### Web Library

用于承载大量导入收藏。

默认结构：

1. Recently Added
2. Favorites
3. Unsorted

主要动作：

1. 导入收藏夹
2. 搜索收藏
3. 添加到 box
4. 导出收藏夹

优先级：高

### Frequent Sites

用于承载常用网址。

默认结构：

1. Pinned
2. Frequent
3. Recently Opened

主要动作：

1. 打开网址
2. 固定或取消固定
3. 添加到 Launcher
4. 添加到当前 box

优先级：高

### Reading List

用于待读文章、文档和网页。

默认结构：

1. To Read
2. Reading
3. Saved

主要动作：

1. 添加网页
2. 标记已读
3. 移动到 Web Library

优先级：中

## v0.5 交付切片

### 0.5.1 Bookmark 数据模型

新增 Bookmark、BookmarkFolder、BookmarkPlacement 或等价结构。

验收标准：

1. Bookmark 可独立于 box 存在
2. URL item 可关联 Bookmark
3. Bookmark 可被搜索、打开和更新 openCount
4. 数据可随 workspace sync/export 一起保存

### 0.5.2 手动收藏与 URL item 关联

支持从 URL item 收藏为 Bookmark。

验收标准：

1. URL item 可一键收藏
2. 已收藏 URL item 有明确状态
3. 收藏后可在全局收藏列表看到
4. 取消收藏不删除 box 内 URL item

### 0.5.3 文件导入浏览器收藏夹

支持导入浏览器书签 HTML 文件。

验收标准：

1. 可选择 HTML 文件导入
2. 能解析文件夹和链接
3. 重复 URL 不重复创建
4. 导入后显示报告
5. 用户可选择是否创建 Web Library box

### 0.5.4 扩展端直连导入

在浏览器扩展环境中，授权后读取浏览器书签树。

验收标准：

1. 用户明确授权后才读取
2. 读取失败有可理解错误
3. 导入结果与 HTML 文件导入走同一归一化逻辑
4. 不影响桌面端文件导入路径

### 0.5.5 收藏夹导出

支持导出浏览器可识别的书签 HTML 文件。

验收标准：

1. 可导出全部收藏
2. 可按文件夹或标签导出
3. 导出的 HTML 能被浏览器导入
4. Cardo JSON 备份继续保留内部元数据

### 0.5.6 常用网址

基于打开行为和手动固定生成常用网址。

验收标准：

1. 打开 Bookmark 或关联 URL item 后更新 lastOpenedAt 和 openCount
2. 用户可固定或取消固定网址
3. Command Center 显示常用网址入口
4. Frequent Sites 模板可展示常用网址
5. 常用网址排序稳定且可解释

### 0.5.7 Web Library 与 Frequent Sites 模板

把收藏能力接入模板体系。

验收标准：

1. 模板选择器出现 Web Library
2. 模板选择器出现 Frequent Sites
3. Web Library 能承载导入后的收藏集合
4. Frequent Sites 能展示固定和高频网址
5. 模板默认内容不制造重复 Bookmark

## 数据与迁移策略

建议新增 workspace schema version。

迁移策略：

1. 旧 workspace 没有 bookmarks 字段时初始化为空集合
2. 旧 URL item 不自动转为 Bookmark
3. 用户触发收藏或导入后才创建 Bookmark
4. 导出 JSON 时包含 bookmarks、bookmarkFolders 和必要关联关系
5. 导入旧 JSON 时保持兼容

去重策略：

1. 使用 normalizedUrl 作为主要去重依据
2. 保留首次导入标题
3. 新导入标题可作为候选别名或覆盖提示
4. 文件夹归属可多源合并

## UX 风险

### 导入后信息过载

风险：用户一次导入几千条收藏，桌面变得不可用。

策略：默认只进入全局 Bookmark 数据库，不自动铺开为 box。

### 收藏与 URL item 概念混淆

风险：用户不理解为什么有 URL item 还有 Bookmark。

策略：UI 上表达为“加入收藏库”和“添加到当前 box”，避免暴露内部名词。

### 常用网址排序不可解释

风险：用户不知道为什么某个网址出现在常用里。

策略：固定项置顶，非固定项显示最近打开或打开次数线索。

### 浏览器导入权限敏感

风险：扩展请求书签权限会让用户警惕。

策略：优先提供文件导入；直连导入在用户主动点击后再请求权限。

## 暂不做

1. 云端书签同步
2. 多浏览器实时双向同步
3. 自动网页截图
4. 自动全文索引网页内容
5. 团队共享收藏夹
6. 在线收藏夹市场

## 成功标准

1. 用户能把浏览器收藏夹导入 Cardo，并看懂导入结果
2. 用户能把 Cardo 收藏导出回浏览器可识别格式
3. 用户能把常用网址固定到快速入口
4. 高频打开的网址能自动浮现
5. 导入大量收藏不会破坏桌面工作区
6. URL item 与 Bookmark 的关系清晰、不互相污染
7. 后续新增 Web Library、Frequent Sites、Reading List 模板时不需要重写收藏数据模型

## 推荐第一阶段目标

v0.5-a 建议先做 Bookmark 数据模型和手动收藏闭环：

1. 新增 Bookmark 和 BookmarkFolder 模型
2. URL item 支持关联 bookmarkId
3. URL item 支持加入收藏库
4. Bookmark 支持打开并更新 openCount、lastOpenedAt
5. Workspace export/import 支持 Bookmark 数据

先把收藏作为一等数据站稳，再进入浏览器收藏夹导入导出。
