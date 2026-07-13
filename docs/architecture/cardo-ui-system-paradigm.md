# Cardo UI 范式（2026 前沿对齐）

| Field   | Value                                      |
| ------- | ------------------------------------------ |
| Status  | Architecture decision                      |
| Date    | 2026-07-14                                 |
| Context | 对「大一统 UI Kit barrel」的复盘与目标范式 |

## 1. 问题：我们刚才在复制一种过时的「大 Kit」

上一阶段的巨型 kit barrel 倾向：

1. 巨型 `index.ts` 桶导出 + 副作用 `import './styles/kit.css'`
2. 第二套 class 前缀与壳层并行
3. 用 ESLint 禁令代替清晰分层
4. 把「所有产品 UI」塞进一个命名空间，像 2018 年的 monorepo Design System

这在短期内能「挡住 AI 乱用 primitives」，但中期会变成：

- 桶文件永远长、循环依赖风险高
- CSS 全局加载、难按路由/表面拆分
- 业务组件与壳组件边界模糊
- 贡献者不知道「该扩 kit 还是写 domain」

## 2. 产业现状（2025–2026 共识）

| 思路                      | 代表                                 | 对 Cardo 的启示                                  |
| ------------------------- | ------------------------------------ | ------------------------------------------------ |
| Headless 原语 + 自有皮肤  | Radix, React Aria, Base UI, Ariakit  | 无样式行为层与视觉层分离                         |
| 拥有源码，不装皮肤 npm    | shadcn/ui, park-ui 思路              | 组件在仓库内二次开发，不是黑盒依赖               |
| 语义 variant，不是主题 if | CVA / Tailwind variants              | `variant="danger"` 映射 token，不写 `themeId===` |
| 设计令牌作为契约          | W3C Design Tokens / CSS vars         | Cardo 已有 Theme Pack → `--cardo-*`，应坚持      |
| 组合 > 巨型预设           | Slot / asChild / compound components | Panel = header + body 组合，而不是一个神组件     |
| 按路径导入，少 barrel     | package exports `./button`           | 避免 `import { 一切 } from kit` 成为唯一习惯     |
| 图标单一家族              | Lucide / Phosphor 等                 | 主题不换图标集（已定：仅 Lucide）                |

结论：前沿不是「再做一个更大的 Kit 品牌」，而是「分层原语 + token 配方 + 领域组合」。

## 3. Cardo 目标范式（推荐）

```text
L0  Theme Pack JSON          tokens only（含 shell）
L1  CSS variables            --cardo-* 已由 applyTheme 写入
L2  kit/internal/primitives  headless/Radix 薄封装，无产品语义
L3  kit 语义组件 / recipe CSS  结构 + variant，只消费 token
L4  domain compounds         features/* · shell layout
L5  surfaces                 web shell (src/web) / extension / desktop titlebar
```

产品 UI 树（单一目录，历史 `web-next` + `web-v2` 已合并）：

```text
src/web/
  app/         # CardoApp, start, stores, bootstrap, styles entry
  shell/       # sidebar shell, settings shell chrome, FeatureGate, chrome.css
  features/    # boxes, canvas, settings body, items, search, ...
  kit/         # product UI kit (path imports: kit/button, kit/icon, ...)
  domain/
  styles/      # product CSS + themes recipes
  themes/      # Theme Pack apply/registry
  i18n/
  platform/    # RuntimeClient host bridge
```

### 命名

| 层         | 路径（目标）                         | 前缀                                         |
| ---------- | ------------------------------------ | -------------------------------------------- |
| 公开组合面 | `src/web/kit` 的语义组件             | `cardo-` 统一                                |
| 内部原语   | `kit/internal/primitives`            | 可收敛                                       |
| 壳布局     | `src/web/shell`                      | `cardo-shell-*` 等仅几何                     |

### 公开 API 形状（目标，非巨型 barrel）

```ts
// 推荐：路径清晰、可 tree-shake、AI 可搜文件
import { Button } from '.../kit/button';
import { NavItem } from '.../kit/nav-item';
import { ThemeIcon } from '.../kit/icon';

// 可保留：轻量 barrel 仅 re-export 高频项（可选）
import { Button, NavItem } from '.../kit';
```

当前 `src/web/kit/index.ts` 可作为兼容 barrel，但新代码应逐步改为按文件路径导入，barrel 禁止再 `import './all.css'` 作为唯一样式入口。

### 样式入口（目标）

1. `app/styles.css`：tokens → base → 按组件或 recipe 分片 → theme recipes 最后
2. 组件侧：优先「类名契约 + 全局 recipe」，避免每个组件再塞一份重复 base
3. Codex 方言：`[data-cardo-theme=codex]` 只改结构方言，不复制业务组件

### 图标

- 唯一：Lucide（`lucide-react`）
- 语义名：`ThemeIcon` 可改名为 `Icon`（破坏性可选），映射表仍集中
- 主题 JSON 不切换图标家族

## 4. 与「强制 AI 不乱写 UI」的关系

禁令有用，但不够。前沿实践叠加：

| 手段                                         | 作用                                   |
| -------------------------------------------- | -------------------------------------- |
| 清晰分层目录 + README 入口文件               | AI 先搜 `kit/nav-item.tsx`             |
| 组件 API 以 intent 命名                      | `variant="danger"` 而不是 class 字符串 |
| ESLint 禁止业务 import internal              | 保留                                   |
| 禁止业务文件硬编码 hex / 裸 button（可渐进） | 比「必须叫 kit」更准                   |
| 示例 / 最小 playground 页                    | 比文档 alone 有效                      |

## 5. 对当前仓库的裁决

| 项                                | 裁决                                      |
| --------------------------------- | ----------------------------------------- |
| 大桶 `kit` + internal 收纳        | 过渡可接受，不是终态                      |
| 仅 Lucide                         | 正确，保持                                |
| 删除 Fluent/MUI 图标依赖          | 正确                                      |
| 业务只从 `src/web/kit` 导入       | 正确；新代码优先路径导入                  |
| `cardo-*` 统一前缀                | 保持；禁止第二前缀                        |
| `index.ts` 副作用导入全部 kit.css | 应改为 styles 入口显式 import（已部分做） |
| 壳布局写在 `src/web/shell`        | 正确：layout ≠ control library            |
| 单一 `src/web` 产品树             | 正确；双文件夹 `web-next` / `web-v2` 已退役 |

## 6. 迁移路线（建议，不一次爆改）

1. Stabilize：修编译、全量业务 `from '.../kit'`、internal 私有、Lucide only（进行中）
2. De-barrel：新增组件用路径导出；barrel 变薄
3. Unify class names：删除双轨前缀
4. Codex recipe 专精：其它主题 recipe 壳层可后补
5. Domain compounds：SettingsRow / SettingsCard 替换 SettingsPanel 内部行结构（进行中；通用行已落地）

## 7. 一句话

> Cardo 要的不是「又一个 Material-UI 式 Kit 品牌」，而是 Radix/shadcn 式拥有源码的原语 + Theme Pack token + 语义组合组件 + 壳层布局；AI 约束靠分层与 intent API，而不是再发明一套前缀。
