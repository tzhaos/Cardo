# Cardo UI Kit 架构审查

| Field   | Value                                       |
| ------- | ------------------------------------------- |
| Date    | 2026-07-14                                  |
| Verdict | FAIL → 强制大规模重构（本会话执行）         |
| Scope   | `ui/kit` + `web-v2` shell + settings chrome |

## 1. 不合格项（审查发现）

| #   | 严重度   | 问题                                                                                    |
| --- | -------- | --------------------------------------------------------------------------------------- |
| 1   | critical | 双轨 class：`cardo-v2-nav-item*` 与 `cardo-nav-item*` 并存，壳层未真正以 Kit 为 SoT |
| 2   | critical | `MainStage` / shell `PanelHeader` 仍手写面板结构，未用 kit `Panel`                      |
| 3   | major    | `SettingsPanel` / `SettingsContent` 仍直接 import `ui/primitives`                       |
| 4   | major    | `IconButton` 仅 re-export cardo，且 `whileTap scale` 违反文字/小图标动效规范            |
| 5   | major    | Kit CSS 仅靠 `index.ts` side-effect import，入口不稳                                    |
| 6   | major    | `web-v2` 仍 import `ui/cardo/context-menu` 旁路 Kit                                     |
| 7   | major    | `TabDeleteConfirmView` 等确认控件未 kit 化                                              |
| 8   | minor    | 文档写「唯一组合面」但 ESLint 未覆盖 settings/domain 组件                               |
| 9   | minor    | 设置表单无 `SettingsRow` 落地使用，API 空转                                             |

## 2. 目标架构（重构后）

```text
web-v2 shell / settings chrome
  → ONLY import ui/kit
ui/kit (cardo-* + semantic components)
  → may use primitives/cardo/icons internally
Theme Pack tokens + kit-base + themes/codex.css
chrome.css = LAYOUT ONLY (flex, widths, canvas well)
```

## 3. 通过标准

1. `web/**` 无 `ui/primitives`、无直接 `ui/cardo/*`（context-menu 并入 kit 导出）
2. 壳层 nav / panel / foot 使用 `cardo-*`，删除重复的 `cardo-v2-nav-item*` 控件样式
3. Settings 控件从 kit 导入
4. IconButton 无 scale tap
5. kit.css 在 web-v2 与 web-next styles 入口显式 import
6. `tsc` / eslint web-v2 绿
