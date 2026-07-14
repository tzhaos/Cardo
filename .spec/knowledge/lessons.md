---
name: lessons
description: 经验教训——reviewer 反复退回的同类问题与 Agent 常犯坑;开工前与复盘沉淀时查
metadata:
  type: doc
  status: 已交付
---

# 经验教训（Lessons Learned）

复发问题的暂存区：记录 reviewer 反复退回的同类问题与 Agent 常犯的坑，让同一个坑不踩第三次。本文档是规范的**候选池**——条目在这里验证价值，稳定后升格，不在这里长住。

## 收录准入

- **同类问题第二次出现才收录**——单次偶发不收，防噪音。
- 来源：reviewer 退回报告、交回物的 known gaps、用户纠偏。
- 不收待办（走任务卡）；不收项目常识（进 `standards/` 或 feature 文档）。

## 条目格式

一条 lesson 一个小节，新条目加在「条目」节最上方（倒序）：

    ### <一句话规避规则>
    - 日期：YYYY-MM-DD
    - 现象：踩了什么坑、复发几次
    - 根因：为什么会发生
    - 规避：怎么做能不再犯（可验证的行为，不是口号）
    - 来源：reviewer 报告 / known gaps / 用户纠偏（附提交或任务标识）

## 升级路径

某条 lesson 被稳定复用（约第三次引用起）→ 升格为 `knowledge/standards/` 规则或 `rules/` 红线，原条目标注「已升格 → <落点>」，保留不删。

## 条目

### 设置 UI 必须抄同页 list-group card 方言，禁止硬塞表单
- 日期：2026-07-13
- 现象：更新代理区把多字段塞进 `card-copy` / 包 `cardo-settings-group`，标题带背景、按钮竖断、文案啰嗦
- 根因：未对照语言/搜索引擎/导出行结构；`cardo-settings-group` 有 item 表面；教程式 long `small`
- 规避：单行 = list-group + card（左 copy、右 Select/Switch/secondary-button/inline Input）；标题只用 subheading；文案极短（对照「用于全局搜索」）；Desktop 改完 `build:all` + `desktop:package`
- 来源：用户纠偏 + settings proxy 迭代（升格已部分进 `cardo-dev-constraints` / 前端规范）

### Windows 检出后宿主软链常失效，先跑 init-host-links
- 日期：2026-07-14
- 现象：`core.symlinks=false` 或无 SeCreateSymbolicLink 时 `.claude/agents` 变成 14 字节文本文件，spec-lint 报软链接未解析
- 根因：Git for Windows 默认不创建真实目录符号链接
- 规避：克隆/重置后执行 `node .spec/tools/init-host-links.mjs`，再 `node .spec/tools/spec-lint.mjs`；勿手改 `.spec/` 副本冒充链接
- 来源：本机 init LumioAgent
