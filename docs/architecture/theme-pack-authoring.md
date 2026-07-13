# Theme Pack 制作与约束

| Field | Value |
| --- | --- |
| Status | Active |
| Date | 2026-07-12 |
| Related | `docs/architecture/ui-theme-system.md`, `themes/README.md`, `src/core/contracts/themePack.ts` |

本文回答：做一个主题包要注意什么、架构如何支撑与约束。本轮 Fluent 打磨中的问题已固化到此清单。

## 1. 本轮修过的问题（教训）

| 症状 | 根因 | 正确做法 |
| --- | --- | --- |
| 设置窗整窗发糊 | Motion 用 `scale` 进出场 + `transform x/y` 定位；拖拽后亚像素 left/top | 文字壳：`left/top` 整数像素；进出场只用 opacity；clamp 时 `Math.round` |
| Fluent/Classic 设置底色无效 | CSS 写死 `#fff` 或半透明 surface，覆盖 token | 一律 `var(--cardo-settings-chrome)` / `settingsHover` |
| 导航图标切换糊 | Motion `layoutId` 指示条 + `filter: drop-shadow` | 静态 CSS 指示条；禁止 filter 叠在 20px 字形上 |
| 双态语言/明暗 icon 糊 | Motion scale / 动画 font-size / 绝对位移动画 | 已删除动态 icon；若再做状态 glyph，只允许 opacity/color 切换 |
| About 标题错位 | 匿名 text + small 依赖 `> span:last-child` | 具名结构：`.cardo-about-copy` / `.cardo-about-name` / `.cardo-about-edition` |
| 主题全塞一个 CSS | 巨石 recipe，冲突难查 | 官方包按 id 拆 recipe；Fluent 再拆 shell/settings/overlays |
| 玻璃 + 半透明 = 看起来糊 | `backdrop-filter` + `rgba` 表面让文字衬在模糊画布上 | 设置等长文壳：`settingsChrome` 不透明 + `chrome.material=solid` |
| 配方写死材质 | 每个主题重复 `backdrop-filter: none` | 用 `tokens.chrome.material` → `data-cardo-chrome-material` → `chrome-material.css` |

## 2. 分层（必须遵守）

```text
L0  Theme Pack JSON     tokens only（颜色/字体/圆角/间距/阴影/动效/chrome）
L1  User overrides      settings 主题色（themeColorOverrides）
L2  Options             pack.options 解析为 token patch
L3  applyTheme          写 --cardo-* + data-cardo-theme + data-cardo-chrome-material
L4  通用 CSS            只消费变量，禁止按主题 id 分叉业务
L5  Recipe CSS          仅结构/材质方言，选择器必须 [data-cardo-theme="<id>"]
```

禁止：

1. 第二套主题引擎或 `--wbn-*` 双轨。
2. 组件里 `if (themeId === 'fluent')` 写业务逻辑（允许极少数壳能力分支，须注释理由）。
3. recipe 里硬编码本可由 token 表达的色值。
4. 主题劫持拖拽根 transform / Resize 帧写库。

## 3. 做官方主题包的清单

1. `OFFICIAL_BUILT_IN_THEME_IDS` 登记 id。
2. `OFFICIAL_THEME_RECIPE_ENTRIES` 登记 recipe 入口路径。
3. 添加 `themes/builtin/<id>/theme.cardo-theme.json`（与用户包同格式）。
4. 添加 recipe：`src/web/styles/themes/<id>.css` 或 `<id>/index.css`，并在 `styles/themes/index.css` import。
5. 跑 `npx tsx scripts/validate-builtin-themes.ts`。
6. 跑 `npm run build` 与 `npm run desktop:build`。
7. 目视：设置、顶栏、盒子、底栏、下拉、明暗两套。

## 4. Token 必填与建议

### 必填

- `colors.light` + `colors.dark` 完整 `ColorTokenMap`（含 `shell` / `settingsChrome` / `settingsHover`）。
- `shell` → `--cardo-shell`：外层产品壳（titlebar + sidebar + 窗体衬底）。与 `canvas`（主面板内工作面）语义不同；勿把 canvas 当成壳色。
- v1 不把 `shell` 放进 `overridableColorKeys`（用户 L1 仍调 canvas 等）；旧用户包缺 `shell` 时，加载边界会用 `ensureThemePackShellColors` 一次性从同 mode 的 `canvas` 或 `settingsChrome` 填充后再严格 parse（不是双 schema）。
- 建议 `chrome.material` 显式为 `glass` 或 `solid`。
- `settingsChrome` / `settingsHover` 应接近不透明（校验脚本会拦明显半透明）。

### chrome

| 字段 | Classic 示例 | Fluent 示例 | 含义 |
| --- | --- | --- | --- |
| material | glass | solid | 浮动层是否 backdrop 模糊 |
| blur | 18px | 0px | 玻璃模糊半径 |
| topbarOffset | 12px | 0px | 浮动顶栏边距 |

`applyTheme` 会写 `data-cardo-chrome-material`；共享规则在 `styles/themes/chrome-material.css`。

### 可覆盖色（用户 L1）

`canvas` | `panel` | `surface` | `text` | `blue` | `createBackground` | `settingsChrome` | `settingsHover`

新增可覆盖键必须同时改：Zod `overridableColorKeys`、presets、i18n、Settings UI。

## 5. Recipe 该写什么 / 不该写什么

### 该写（结构方言）

- 顶栏：全宽贴边 vs 居中胶囊。
- Tab：下划线 vs 填充 pill。
- 盒子圆角/描边语言（若 radius token 不够表达组件级差异）。
- 设置侧栏导航轨、SearchBox 底边强调线。
- 下拉左轨选中等组件几何。

### 不该写

- 业务色（用 token）。
- 重复 `backdrop-filter: none` 对抗 glass（改 material）。
- 对文字容器 `transform: scale`、`filter: blur/drop-shadow`。
- 与 Classic 行为双轨长期并存的旧类名。

## 6. 清晰度（Paint）硬约束

适用于设置窗、About、长文列表等文字壳：

1. 定位：CSS `left`/`top` 或整数像素；禁止长期挂在 `transform: translate` 上。
2. 进出场：opacity only；禁止 scale 留在文字祖先上。
3. 背景：`settingsChrome` 不透明；solid material 关闭 backdrop-filter。
4. 指示器：静态 CSS 优先；避免 layoutId 在兄弟图标下滑动造成合成模糊。
5. 小图标：禁止 filter；SVG 复杂渐变在 16–20px 会显软，需接受或改扁平色。
6. 拖拽结束：`Math.round` 几何后再提交 store。

实现参考：`src/web/shell/SettingsShell.tsx`（全壳设置）、`src/web/styles/themes/chrome-material.css`。

## 7. 组件与 UI 约束

1. 通用组件只读 `--cardo-*`。
2. 设置 chrome/hover 禁止组件内 hex。
3. 主题专属图标（如 Fluent 彩色 nav）放独立模块，Classic 保持单色。
4. 状态图标若恢复：纯 CSS，禁止 Motion scale。
5. 同一 CSS 属性同一状态只有一个动效所有者（Agents.md）。

## 8. 校验与 CI 入口

```bash
npx tsx scripts/validate-builtin-themes.ts
```

失败条件包括：缺 JSON、id 不一致、缺 recipe、settings 色半透明、缺 `chrome.material`。

## 9. 用户包 vs 官方包

| | 官方 | 用户导入 |
| --- | --- | --- |
| 路径 | `themes/builtin/<id>/` | 数据目录 themes / 导入 JSON |
| 可被覆盖 | 否 | 可删除/更新 |
| Recipe CSS | 产品仓库内 | 仅 token + 可选 cssSnippet |
| 结构方言 | 完整 recipe | 无 DOM 重组能力 |

用户包不能把顶栏改成 Fluent 全宽结构，除非未来提供 Layout Profile；这是有意边界。

## 10. 新增 token 的流程

1. Zod `colorTokenMapSchema` / 对应 CSS var map。
2. `applyTheme` 写入（若非 color 组，补 radius/space/…）。
3. 两套官方 JSON 补值。
4. 通用 CSS 改用变量。
5. 若用户可调：overridable keys + Settings + i18n。
6. 校验脚本与文档。
