# Cardo Theme Packs

内置主题与用户主题使用同一套文件格式与目录约定。

设计总览见 `docs/architecture/ui-theme-system.md`。

## 分层模型

```text
themes/builtin/<id>/theme.cardo-theme.json   ← L0 tokens（配色、字体、圆角…）
        ↓ applyTheme → --cardo-* CSS variables
src/web-next/styles/**/*.css                 ← 通用组件只消费变量
src/web-next/styles/themes/<id>.css          ← 该包结构/材质 recipe
```

- JSON 管可序列化 token；`applyTheme` 写到 `documentElement`。
- 通用 CSS 禁止按主题 id 分叉业务结构。
- 仅当 tokens 表达不了结构差异时，才写 per-pack recipe（选择器挂在 `[data-cardo-theme="<id>"]` 下）。

## 官方主题

| id | 名称 | 语言 |
| --- | --- | --- |
| `classic` | Classic（默认） | Cardo 玻璃壳层、居中胶囊顶栏 |
| `fluent` | Windows Fluent | Win11 画布、全宽顶栏、下划线 tab、扁平卡片、设置侧栏 |

### 包文件

```text
themes/builtin/
  classic/theme.cardo-theme.json
  fluent/theme.cardo-theme.json
```

### Recipe 文件（按包拆分）

```text
src/web-next/styles/themes/
  index.css      ← 聚合入口（app/styles.css 导入）
  shared.css     ← 各包共用的 transition 等
  classic.css    ← [data-cardo-theme='classic']
  fluent.css     ← [data-cardo-theme='fluent']
```

新增官方主题时：

1. 在 `OFFICIAL_BUILT_IN_THEME_IDS` 登记 id（`src/core/contracts/themePack.ts`）
2. 添加 `themes/builtin/<id>/theme.cardo-theme.json`
3. 添加 `src/web-next/styles/themes/<id>.css` 并在 `index.css` 中 `@import`
4. 跑 `npx tsx scripts/validate-builtin-themes.ts`

`OFFICIAL_BUILT_IN_THEME_IDS` 见 `src/core/contracts/themePack.ts`。官方 id 不可被磁盘/导入覆盖。

## 主题色覆盖

设置 → 外观 → 主题色。按当前主题 id + light/dark 持久化到 `theme_color_overrides`。

可覆盖键：`canvas` | `panel` | `surface` | `text` | `blue` | `createBackground` | `settingsChrome` | `settingsHover`。

## 运行时入口

| 文件 | 职责 |
| --- | --- |
| `src/core/contracts/themePack.ts` | Zod Theme Pack 契约 |
| `src/web-next/themes/builtInPacks.ts` | 从 builtin JSON 加载官方包 |
| `src/web-next/themes/resolveTheme.ts` | pack ⊕ overrides ⊕ options |
| `src/web-next/themes/applyTheme.ts` | 写 CSS 变量与 data 属性 |
| `src/web-next/themes/themeRegistry.ts` | 注册表 + 对外 API |

## 校验

```bash
npx tsx scripts/validate-builtin-themes.ts
```
