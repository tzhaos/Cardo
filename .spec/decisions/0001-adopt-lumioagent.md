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
- 宿主发现链：`.claude/{agents,skills}`、`.agents/skills` → `.spec/`（Windows 可用 junction，见 `.spec/tools/init-host-links.mjs`）

## 后果

- 改调度 / 规范必须改 `.spec/` 并跑 `node .spec/tools/spec-lint.mjs`
- 产品门禁与出包规则以 `cardo-dev-constraints` 为准，与框架收口门槛对齐
- Windows 无管理员符号链接权限时需本机跑 `init-host-links`，不把 junction 当仓库真值
