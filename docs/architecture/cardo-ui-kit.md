# Cardo UI Kit

| Field       | Value                                                                          |
| ----------- | ------------------------------------------------------------------------------ |
| Status      | Active                                                                         |
| Date        | 2026-07-14                                                                     |
| Public path | `src/web/kit` only                                                             |
| Icons       | Lucide only (`internal/icons/lucidePack.ts`)                                   |
| Paradigm    | See `docs/architecture/cardo-ui-system-paradigm.md`（终态不是巨型 barrel Kit） |

## 硬规则（当前强制）

1. 应用代码只从 `src/web/kit` 导入；推荐路径导入（`kit/button`、`kit/nav-item`、`kit/icon`），兼容 barrel `kit`。
2. 禁止 import `kit/internal/**`。
3. 禁止 Fluent / Material 图标；仅 Lucide。
4. 缺控件：在 `kit/components` 增加并加路径 re-export，禁止业务旁路。
5. 主题换皮：Theme Pack + recipe；图标不随主题切换。

## 目录

```text
src/web/kit/
  index.ts              # 兼容 barrel（将变薄）
  button.tsx            # 路径 re-export 示例
  nav-item.tsx
  icon.tsx
  …
  components/           # 语义组合（Button、NavItem…）
  styles/               # base + codex dialect
  internal/             # 私有：Radix 薄封装、Lucide、error/context
```

已删除公开路径：`ui/primitives`、`ui/cardo`、`ui/icons`、`ui/lib`，以及历史 `src/web/ui/kit` 嵌套。

## 与产品树关系

Headless 原语（`kit/internal`）+ token（Theme Pack）+ 语义组件（`kit`）+ 壳布局（`src/web/shell`）。  
领域组合在 `src/web/features`；应用入口与 stores 在 `src/web/app`。

新组件优先「路径可发现」；类名统一 `cardo-*`。
