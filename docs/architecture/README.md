# Architecture docs index

Cardo 架构文档目录。协议与本机拓扑以代码为准；变更 Hard Decisions 时同步修订对应 SoT。

| Document | One-line |
| --- | --- |
| [overview.md](./overview.md) | 新贡献者总览：产品、Runtime 模型、代码落位、如何跑与如何发版 |
| [local-runtime-multi-client.md](./local-runtime-multi-client.md) | 本机 Runtime 多 client 架构 SoT：拓扑、Path、协议、session、迁移 |
| [robustness-and-operations.md](./robustness-and-operations.md) | 运维：lock/discovery、日志、启停、更新校验、恢复与威胁模型 |
| [theme-pack-authoring.md](./theme-pack-authoring.md) | 官方 / 用户 Theme Pack 写作与校验 |
| [ui-theme-system.md](./ui-theme-system.md) | 主题系统与 token / recipe 总览 |
| [cardo-ui-system-paradigm.md](./cardo-ui-system-paradigm.md) | 产品 UI 分层：`src/web` app/shell/features/kit |
| [cardo-ui-kit.md](./cardo-ui-kit.md) | `src/web/kit` 公开 API 与硬规则 |
| [web-v2-codex-shell-design.md](./web-v2-codex-shell-design.md) | 侧栏壳 + Codex 主题设计（cutover COMPLETE；路径现为 `src/web/shell`） |
| [group-view-modes.md](./group-view-modes.md) | 分组视图：画布 / 瀑布流 / 列表（产品「分组」= 原页面） |
| [cardo-rename-checklist.md](./cardo-rename-checklist.md) | 产品与仓库改名检查清单 |
| [../reviews/archive/zod-drizzle-shadcn-refactor.md](../reviews/archive/zod-drizzle-shadcn-refactor.md) | Archived finished checklist (pointer also at zod-drizzle-shadcn-refactor.md) |
| [../reviews/archive/comprehensive-health-review-2026-07-12.md](../reviews/archive/comprehensive-health-review-2026-07-12.md) | Archived health review (pointer also at comprehensive-health-review.md) |

贡献者硬约束见仓库根目录 `AGENTS.md`。
