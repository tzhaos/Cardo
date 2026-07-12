# Cardo UI Theme & Composition System

| Field | Value |
| --- | --- |
| Status | Active (Phase A/B landed; lessons from Fluent polish) |
| Date | 2026-07-12 |
| Related | `AGENTS.md`, `theme-pack-authoring.md`, `themes/README.md`, `src/core/contracts/themePack.ts` |
| Goal | 支持风格迥异的前端主题：配色/字体自定义、功能开关组合、样式可扩展 |
| Recipes | 按包拆分：`src/web-next/styles/themes/<id>…`（见 §4.4） |
| Authoring | 制作清单与清晰度约束见 `docs/architecture/theme-pack-authoring.md` |

## 1. 可行性结论（先说清楚）

目标可达成，但必须分层。Obsidian 式「整站换皮 + 插件拼装」不是一次 PR 能做完的；可以拆成可交付的能力阶梯。

| 能力 | 难度 | 与现状差距 | 判断 |
| --- | --- | --- | --- |
| 配色 / 明暗 / 多内置主题 | 低 | 已有 palette → CSS variables | 已部分具备，可立即加深 |
| 字体、圆角、密度、阴影尺度 | 低–中 | 仅有 `--wbn-font-sans`，几何多写死在 CSS | 高可行性 |
| 主题包 JSON 导入导出 | 中 | 无 Theme Pack 契约 | 高可行性 |
| 主题选项（类似 Style Settings） | 中 | 无 options schema | 高可行性 |
| CSS Snippet / 社区样式注入 | 中–高 | 无安全注入点；需 CSP / 隔离 | 可行，需约束 |
| 功能启用关闭任意组合 | 中–高 | 功能与组件硬耦合，无 Feature Catalog | 可行，需壳层槽位 |
| 布局形态完全不同（侧栏 IDE vs 浮动 chrome） | 高 | Canvas/TopBar/Box 结构写死 | 只能靠「内置 Layout Profile」，不能指望任意 CSS 改 DOM |
| 社区插件任意改业务逻辑 | 很高 | 无插件运行时 | 明确非目标（v1–v2） |

核心判断：

1. 视觉差异（配色、字体、圆角、密度、阴影、边框语言）→ 用 Design Token + Theme Pack 解决，这是「风格迥异」的主战场，性价比最高。
2. 功能组合 → 用 Feature Catalog + Shell Slots 解决，主题可推荐默认组合，但最终状态进 preferences（经 Command），不是散落的 if 字符串。
3. 结构级换皮（DOM 拓扑大变）→ 只提供少量一等公民 Layout Profile（产品自己实现），不承诺「一份 CSS 变成另一个产品」。
4. 画布几何、拖拽、Resize、Page Tab 命中区仍属产品专用结构（Agents.md），主题不得劫持拖拽 transform 所有权。

类比 Obsidian 的边界：

```text
Obsidian: 主题 CSS + Style Settings + 插件 API
Cardo v1 目标: Theme Pack（tokens + options + optional snippet）+ Feature Catalog
Cardo v2: Layout Profile + 主题市场导入
不承诺: 任意插件改 Command/Runtime
```

## 2. 现状（代码事实）

### 2.1 已有

1. `src/web-next/themes/themeRegistry.ts`：内置 classic / ocean / orchid；light+dark palette；`applyWebNextTheme` 把约 30 个颜色 token 写到 root CSS variables。
2. preferences：`colorMode`、`themeId` 经 Command 持久化。
3. Settings UI 可切换模式与主题卡。
4. `ui/primitives` + `ui/cardo`：Radix 行为 + 产品壳。
5. CSS 分层：`tokens.css`、`shell`、`boxes`、`items`、`top-bar` 等。

### 2.2 缺口

1. Token 几乎只有颜色；无字体栈、字号阶、圆角阶、间距密度、动效时长、z-index 语义表的完整主题化。
2. 大量硬编码：radius `16px`/`999px`、固定 top/z-index、组件内 hex 残留。
3. 无用户自定义字体/色板编辑器；无 Theme Pack 文件格式。
4. 功能与 chrome 始终挂载（TopBar、History、BottomToolbar、CanvasTools…），不能按主题或用户组合开关。
5. 无安全 CSS 注入通道，无法像 Obsidian 那样用 snippet 做出「完全不同」的装饰层。
6. Layout 只有一种 shell 拓扑。

## 3. 目标分层模型

```text
┌─────────────────────────────────────────────────────────┐
│  Theme Pack（可导入的主题包，Zod 契约）                    │
│  tokens + options + optional cssSnippet + layoutHint    │
└───────────────────────────┬─────────────────────────────┘
                            │ apply
┌───────────────────────────▼─────────────────────────────┐
│  Design Token Runtime（CSS variables on :root / [data]） │
│  color · font · radius · space · elevation · motion     │
└───────────────────────────┬─────────────────────────────┘
                            │ consume
┌───────────────────────────▼─────────────────────────────┐
│  Shell Composition                                      │
│  Layout Profile + Feature Catalog（槽位开关）             │
└───────────────────────────┬─────────────────────────────┘
                            │ render
┌───────────────────────────▼─────────────────────────────┐
│  Product Surfaces                                       │
│  Canvas / Box / Item / Page Tab（结构稳定，token 驱动）   │
└─────────────────────────────────────────────────────────┘
```

原则：

1. 主题改「变量与开关」，不改业务 Command/Query。
2. 同一 CSS 属性同一状态下仍只有一个动效所有者（Agents）。
3. 禁止新旧双轨主题引擎长期共存；落地时替换扩展现有 `themeRegistry`，而不是旁路一套。
4. Theme Pack、Feature Flags、Layout Profile 全部用 Zod 描述；`z.infer` 派生类型。

## 4. Design Token 体系（Theme 的主 API）

### 4.1 Token 组

| 组 | 示例 CSS 变量 | 说明 |
| --- | --- | --- |
| color | `--cardo-canvas`, `--cardo-panel`, `--cardo-text`, `--cardo-accent-*` | 现有 `--wbn-*` 逐步改名/映射为 `--cardo-*` |
| font | `--cardo-font-sans`, `--cardo-font-mono`, `--cardo-font-size-*`, `--cardo-line-height-*` | 用户可选系统字体或内置 webfont |
| radius | `--cardo-radius-sm/md/lg/pill` | box、menu、tab 共用 |
| space | `--cardo-space-1…8`, `--cardo-density` | density 用 scale 因子 |
| elevation | `--cardo-shadow-*` | 替代散落 box-shadow 字面量 |
| chrome | `--cardo-chrome-blur`, `--cardo-topbar-offset` | 壳层专用 |
| motion | `--cardo-duration-fast/normal`, `--cardo-easing` | 不接管 drag transform |

迁移策略：第一阶段 `applyTheme` 同时写 `--wbn-*` 与 `--cardo-*` 等价映射一段时间不可取（用户禁止双轨兼容）。应一次性把样式引用切到 `--cardo-*`，旧 `--wbn-*` 删除。

### 4.2 Theme Pack 契约（示意）

```text
ThemePack {
  id: string
  version: semver
  name: { en, zh }
  description?: { en, zh }
  tokens: {
    colors: Record<ColorMode, ColorTokenMap>
    fonts?: FontTokenMap
    radii?: RadiusTokenMap
    space?: SpaceTokenMap
    elevation?: ElevationTokenMap
    motion?: MotionTokenMap
  }
  options?: ThemeOptionDef[]   // Style Settings 式
  features?: Partial<FeatureFlags>  // 推荐默认，非强制覆盖用户偏好
  layoutProfileId?: LayoutProfileId
  cssSnippet?: string          // 仅允许选择器挂在 [data-cardo-theme="id"] 下
}
```

Zod 落在 `src/core/contracts/themePack.ts`（跨 client 导入时与 preferences 同边界）。应用只在 Renderer；Runtime 只存 preferences 中的序列化选择结果。

### 4.4 按包拆分的 recipe CSS

Token 放在 `themes/builtin/<id>/theme.cardo-theme.json`。当 tokens 不足以表达结构/材质差异时，使用 per-pack recipe，禁止把所有主题选择器堆进单一巨石文件。

```text
src/web-next/styles/themes/
  index.css
  shared.css
  chrome-material.css   ← data-cardo-chrome-material (glass|solid)
  classic.css
  fluent/
    index.css
    shell.css
    settings.css
    overlays.css
```

新增官方主题：`OFFICIAL_BUILT_IN_THEME_IDS` + `OFFICIAL_THEME_RECIPE_ENTRIES` → JSON 包 → recipe → `index.css` import → `validate-builtin-themes.ts`。

### 4.5 Chrome material（玻璃 vs 实心）

| material | blur | 用途 |
| --- | --- | --- |
| glass | > 0 | Classic 浮动玻璃；半透明 surface + backdrop-filter |
| solid | 0 | Fluent / 设置长文壳；不透明 + 无 backdrop 模糊 |

`applyTheme` 写入 `data-cardo-chrome-material`。设置窗背景一律 `--cardo-settings-chrome`（须不透明）。细节与清晰度硬约束见 `theme-pack-authoring.md`。

### 4.3 用户自定义

| 层 | 内容 |
| --- | --- |
| L0 内置包 | `themes/builtin/<id>/theme.cardo-theme.json`，与用户包同格式，代码只负责加载 |
| L1 色板微调 | 用户覆盖 accent、canvas、panel 等关键色（合并进 effective tokens） |
| L2 字体 | 从系统字体列表选 sans；可选 mono；字号基准 scale |
| L3 选项 | 主题自带 options（如「玻璃拟态」「实心 chrome」） |
| L4 snippet | 高级用户粘贴 CSS（默认关闭或需确认） |
| L5 导入 | `.cardo-theme.json` 文件导入；校验失败拒绝 |

有效主题计算：

```text
effective = basePack.tokens
  ⊕ userOverrides
  ⊕ optionResolvedTokens
  → apply to documentElement
```

## 5. Feature Catalog（功能任意组合）

### 5.1 功能不是主题私有，是壳层能力

主题可以建议默认开关；用户可在 Settings → Interface 覆盖。状态进入 preferences（Command），跨 Web/Desktop/Extension 同步。

### 5.2 v1 Feature 清单（建议）

| Feature id | 槽位 | 默认 | 说明 |
| --- | --- | --- | --- |
| `chrome.topBar` | shell.top | on | 页签条 |
| `chrome.historyToolbar` | shell.corner | on | 撤销重做 |
| `chrome.bottomToolbar` | shell.bottom | on | 设置等 |
| `chrome.canvasTools` | canvas.overlay | on | 画布工具 |
| `chrome.globalSearch` | shell.modal | on | 全局搜索 |
| `chrome.runtimeBanner` | shell.toast | on | 连接状态 |
| `workspace.collection` | topBar.tab | on | 集合页 |
| `workspace.recycleBin` | topBar.tab | on | 回收站 |
| `workspace.multiPage` | topBar | on | 关闭则单页模式（产品需定义） |
| `box.appearancePopover` | box.chrome | on | 盒子外观 |
| `item.contextMenu` | item | on | 项菜单 |

实现要点：

1. `WebNextApp` 只渲染 `isFeatureEnabled(id)` 为真的槽位。
2. Feature 依赖声明：如 `workspace.recycleBin` 依赖 `chrome.topBar`。
3. 关闭 chrome 不得破坏 Canvas 命中与拖拽；只是不挂载 UI。
4. 不做「任意字符串 feature id 动态加载业务」；catalog 封闭，扩展 catalog 需代码 PR。

## 6. Layout Profile（结构级差异的务实解）

完全自由布局不现实。提供内置 profile：

| Profile | 描述 |
| --- | --- |
| `classic` | 当前：顶栏居中 + 底栏 + 无限画布 |
| `compact` | 更小 chrome、更小 radius、更高密度 token |
| `immersive` | 自动隐藏 chrome，悬停/快捷键唤出（后置） |

每个 profile 是产品实现的 React 壳变体 + 默认 density/token，不是用户 CSS 改 DOM。

主题包可设 `layoutProfileId` 作为推荐；用户可锁死自己的 profile。

## 7. 与 Obsidian 对照

| Obsidian | Cardo 对应 | 取舍 |
| --- | --- | --- |
| CSS 变量主题 | Design Token + Theme Pack | 对齐 |
| Style Settings | Theme options schema | 对齐 |
| CSS snippets | 可选 cssSnippet + 严格选择器前缀 | 对齐但默认更严 |
| 社区主题商店 | 后期：文件导入 / 目录扫描 | 后置 |
| 插件改 UI 与逻辑 | Feature Catalog（封闭） | 不开放任意插件 |
| 工作区布局 JSON | Layout Profile + feature flags | 简化 |

## 8. 安全与多 Client

1. Theme Pack 解析失败 → 拒绝应用，回退内置 classic（仅内置兜底，不是旧格式双读）。
2. cssSnippet 必须：
   - 最大体积限制
   - 禁止 `@import` 外网（或严格白名单）
   - 强制作用在 `[data-cardo-theme="…"]` / `[data-cardo-root]` 下（构建时或运行时校验尽力）
3. Extension CSP：snippet 若注入 style 标签需评估 `style-src`；Desktop/Web 相对宽松。
4. preferences 同步：themeId、colorMode、overrides、featureFlags、layoutProfileId 走 Runtime Command；Theme Pack 本体优先本地装载（大 JSON 不塞 DB），可选「用户主题库」表后置。

## 9. 实现落点（代码）

| 模块 | 职责 |
| --- | --- |
| `src/core/contracts/themePack.ts` | Zod Theme Pack / options / feature flags |
| `themes/builtin/<id>/theme.cardo-theme.json` | 官方包 tokens（与用户包同格式） |
| `src/web-next/styles/themes/<id>.css` | 官方包结构/材质 recipe（按 id 拆分） |
| `src/web-next/styles/themes/index.css` | recipe 聚合入口 |
| `src/core/contracts/preferences.ts` | 扩展 preferences 字段 |
| `src/web-next/themes/*` | 替换扩展现有 registry：load、merge、apply |
| `src/web-next/shell/FeatureGate.tsx` | 功能开关 |
| `src/web-next/shell/layouts/*` | Layout profiles |
| `src/web-next/styles/*` | 全部消费 token，消灭硬编码色/半径 |
| Settings | 主题编辑、字体、功能、导入导出 |

## 10. 分阶段交付（建议 PR 切分）

### Phase A — Token 完备化（必须先做）

1. 定义完整 token 表与 Zod。
2. 样式全面改用 token（radius/font/space/elevation）。
3. 内置 3 主题升级为完整 pack。
4. 设置项：字体族、字号 scale、density。

出口：不改结构也能做出「冷淡 / 紧凑 / 高对比」明显差异。

### Phase B — Theme Pack 导入 + 用户覆盖

1. 导入/导出 `.cardo-theme.json`。
2. 用户色板覆盖 + 重置。
3. Theme options 渲染器。

出口：第三方可只靠 JSON 做迥异配色主题。

### Phase C — Feature Catalog

1. 槽位化 chrome。
2. Settings 开关 + 依赖校验。
3. 主题推荐 defaults（首次应用可询问，不静默覆盖用户）。

出口：极简主题可关掉大半 chrome。

### Phase D — Layout Profile + Snippet

1. compact / immersive profile。
2. 受控 CSS snippet。
3. 主题目录约定（Desktop 用户目录 / 开发 themes/）。

出口：接近「风格迥异的 Cardo 前端」产品叙事。

### 明确不做（近中期）

1. 任意社区插件改 Runtime/Command。
2. 用 CSS 完全重写 Canvas 命中模型。
3. 为旧 Theme 格式保留双读。

## 11. 风险

| 风险 | 严重度 | 缓解 |
| --- | --- | --- |
| 硬编码 CSS 漏网导致主题「半残」 | 高 | Phase A 审计清单 + lint 禁硬编码色（可选） |
| Feature 开关组合爆炸 | 中 | 封闭 catalog + 依赖图 + 默认配置 |
| Snippet 破坏布局/安全 | 高 | 默认关、前缀强制、体积限制 |
| 多 client 主题不同步 | 中 | preferences 经 Runtime |
| 期望「一份 CSS = 新产品」 | 预期管理 | Layout Profile 文档写清边界 |

## 12. 工作量粗估

| Phase | 量级 | 说明 |
| --- | --- | --- |
| A | 中 | 触达几乎所有 CSS + token 表 |
| B | 中 | 契约 + Settings + 导入 |
| C | 中–大 | Shell 重构槽位 |
| D | 大 | 多布局 + snippet 安全 |

整体：用 1–2 个大版本周期可达到「风格迥异」；其中 Phase A+B 已能覆盖 70% 视觉差异诉求。

## 13. Key Decisions（建议锁定）

1. 主题系统以 Design Token + Theme Pack 为唯一扩展面，不并行第二套皮肤引擎。
2. 功能组合走封闭 Feature Catalog，不走任意插件。
3. 结构差异只通过内置 Layout Profile。
4. 画布/拖拽/Resize 所有权不变。
5. preferences 存选择结果；Theme Pack 本体文件化。
6. CSS 变量前缀统一 `--cardo-*`，一次切干净。
7. Snippet 后置且默认受限。

## 14. Open Questions（需产品拍板）

1. 主题导入是否允许远程 URL，还是仅本地文件？
2. Feature 关闭「多页」是否进入 v1 catalog？
3. Extension 是否与 Desktop/Web 共用同一 Theme Pack 加载源？
4. 是否需要「开发者主题热重载」命令（`cardo theme watch`）？

## 15. 建议的下一步

1. 新增官方主题严格走 `theme-pack-authoring.md` 清单。
2. 继续把通用 CSS 中的硬编码色/半径迁到 token（Phase A 残余）。
3. Feature Catalog / Layout Profile 仍按 Phase C/D，不要从 Snippet 起手。

## 16. Fluent 打磨后的架构定论

1. Token 表达「看起来像什么色/多圆/多密」；Recipe 表达「壳怎么摆」。
2. 材质（glass/solid）是 token + data 属性，不是每个 recipe 复制粘贴 filter 开关。
3. 文字壳清晰度是产品约束，不是主题可选特效：整数几何、无 scale、settings 不透明。
4. 官方包：classic、fluent、material、apple；退休主题不留兼容双读。
5. 校验脚本是官方包的门禁，不是可选文档。
