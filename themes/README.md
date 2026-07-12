# Cardo Theme Packs

内置主题与用户主题使用同一套文件格式与目录约定。

- 架构总览：`docs/architecture/ui-theme-system.md`
- 制作清单与本轮教训：`docs/architecture/theme-pack-authoring.md`

## 分层模型

```text
themes/builtin/<id>/theme.cardo-theme.json   ← L0 tokens
        ↓ applyTheme → --cardo-* + data-cardo-theme + data-cardo-chrome-material
src/web-next/styles/**/*.css                 ← 通用组件只消费变量
src/web-next/styles/themes/chrome-material.css ← material 共享规则
src/web-next/styles/themes/<id>…             ← 该包结构方言 recipe
```

- JSON 管可序列化 token；`applyTheme` 写到 `documentElement`。
- 通用 CSS 禁止按主题 id 分叉业务结构。
- 仅当 tokens 表达不了结构差异时，才写 per-pack recipe（选择器挂在 `[data-cardo-theme="<id>"]` 下）。
- 浮动壳材质（玻璃/实心）用 `tokens.chrome.material`，不要在每个 recipe 里重复对抗 `backdrop-filter`。

## 官方主题

| id | 名称 | material | 语言 |
| --- | --- | --- | --- |
| `classic` | Classic（默认） | glass | 玻璃壳、居中胶囊顶栏 |
| `fluent` | Windows Fluent | solid | 全宽顶栏、下划线 tab、扁平卡片、设置侧栏 |
| `material` | Material You | solid | M3 / AI Studio：粉彩表面、大圆角、软阴影、单色导航 |

### 包文件

```text
themes/builtin/
  classic/theme.cardo-theme.json
  fluent/theme.cardo-theme.json
  material/theme.cardo-theme.json
```

### Recipe 文件

```text
src/web-next/styles/themes/
  index.css              ← 聚合入口
  shared.css             ← 各包共用 transition
  chrome-material.css    ← glass | solid 浮动壳
  classic.css
  fluent/
    index.css
    shell.css
    settings.css
    overlays.css
  material/
    index.css
    shell.css
    settings.css
    overlays.css
```

### 新增官方主题

1. `OFFICIAL_BUILT_IN_THEME_IDS` 登记 id（`src/core/contracts/themePack.ts`）
2. `OFFICIAL_THEME_RECIPE_ENTRIES` 登记 recipe 路径
3. `themes/builtin/<id>/theme.cardo-theme.json`（含 light/dark、`settingsChrome` 不透明、`chrome.material`）
4. recipe CSS + `styles/themes/index.css` import
5. `npx tsx scripts/validate-builtin-themes.ts`
6. `npm run build` 与 `npm run desktop:build`

官方 id 不可被磁盘/导入覆盖。

## 主题色覆盖

设置 → 外观 → 主题色。按当前主题 id + light/dark 持久化。

可覆盖键：`canvas` | `panel` | `surface` | `text` | `blue` | `createBackground` | `settingsChrome` | `settingsHover`。

## 运行时入口

| 文件 | 职责 |
| --- | --- |
| `src/core/contracts/themePack.ts` | Zod 契约、官方 id、recipe 映射 |
| `src/web-next/themes/builtInPacks.ts` | 加载官方 JSON |
| `src/web-next/themes/resolveTheme.ts` | pack ⊕ overrides ⊕ options |
| `src/web-next/themes/applyTheme.ts` | CSS 变量 + data 属性 |
| `src/web-next/themes/themeRegistry.ts` | 注册表 |
| `src/web-next/components/settings/SettingsWindow.tsx` | 整数 left/top、opacity 进出场 |

## 校验

```bash
npx tsx scripts/validate-builtin-themes.ts
```
