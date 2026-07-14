# 0001 · 采用 LumioAgent 作为本仓 Agent 规范权威

- 日期:2026-07-14
- 状态:生效

## 背景

Cardo 多 surface（CLI / Web / Extension / Desktop）与 Runtime 架构约束多，AI 协作需要统一调度、审查与知识落点；分散的根目录长文会与工具入口分叉。

## 决策

以 `.spec/` 为唯一 Agent 规范权威（LumioAgent 骨架）：

- 中心调度：`.spec/AGENTS.md`
- 产品硬约束：`.spec/knowledge/standards/cardo-dev-constraints.md`
- 硬红线：`.spec/rules/system.md`
- 根 `AGENTS.md` / `CLAUDE.md` 仅作指针或 `@import`，不设第二套规则
- 宿主发现链：`.claude/{agents,skills}`、`.agents/skills` → `.spec/`
- **相对种子仓的故意偏离**：上游 LumioAgent 把上述路径作为 **git symlink 入库**；Cardo 在 Windows 上改为 **gitignore + `npm run spec:init-links` 本机创建**（symlink 或 junction），避免 Git 把 junction 目标树列成大量 untracked。权威内容仍只在 `.spec/`。

## 后果

- 改调度 / 规范必须改 `.spec/` 并跑 `node .spec/tools/spec-lint.mjs`（或 `npm run spec:lint`）
- 产品门禁与出包规则以 `cardo-dev-constraints` 为准，与框架收口门槛对齐
- 新克隆 / 换机后须跑 `npm run spec:init-links`，再 `npm run spec:lint`
- 不把 junction / 本机链接当仓库真值；技能与 agent 定义只改 `.spec/`
