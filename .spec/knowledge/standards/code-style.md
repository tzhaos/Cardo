---
name: code-style
description: 代码与文档风格——语言约定、命名、注释原则、生成物纪律;写代码/建文档时查
metadata:
  type: doc
  status: 已交付
---

# 代码与文档风格

> 能交给工具（formatter / linter）强制的，优先交给工具；本文只写工具管不了、需要人 / Agent 判断的部分。

## 语言与文件命名（通用）

- **规范主体使用中文**（`.spec/` 下全部文档）；例外：根 `CLAUDE.md`（宿主入口惯例）与 `skills/` 下允许英文技能文档（中英以该技能既有语言为准，不混写）。落地项目若改用其他语言，需全仓一致并同步 `.spec/tools/spec-lint.mjs` 里的中文枚举值。
- 文件与目录命名一律 **kebab-case**；agent 文件 `<name>.agent.md`、skill 目录 `skills/<name>/`、ADR `NNNN-<slug>.md`。

## 注释原则（通用）

- 注释只写**代码表达不了的约束**（为什么这样做、边界条件、外部依赖的坑）。
- 不写「改动说明」式注释（改了什么、为什么正确）——那是给评审人的话，进交回物或提交信息，不进代码。
- 注释密度、命名、习语向**周边既有代码**看齐。

## 生成物纪律（通用）

- 生成物不得手改，只能经生成源与生成命令更新，并与生成源一起提交（红线见 [`rules/system.md`](../../rules/system.md)）。

## 语言 / 框架特定风格（Cardo）

- TypeScript + Prettier（`npm run format` / `format:check`）+ ESLint + tsc
- UI：`src/web`，组件只从 `src/web/kit` 导入；类名 / CSS 变量前缀 `cardo-` / `--cardo-*`
- 契约：Drizzle Schema 是持久化 SoT；Zod 是运行时边界；禁止手写与 Zod 重复的业务 interface
- 产品文案：`src/web/i18n/messages.ts` 中英双语；输出 Markdown 未经允许禁止加粗（见 cardo-dev-constraints）
- 官方主题仅 `codex`；改主题必须 `validate:themes`
- 架构细节见 `docs/architecture/` 与 [`cardo-dev-constraints.md`](./cardo-dev-constraints.md)
