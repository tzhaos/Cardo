# Cardo Theme Packs

内置主题与用户主题使用同一套文件格式与目录约定。

- 架构总览：`docs/architecture/ui-theme-system.md`
- 制作清单：`docs/architecture/theme-pack-authoring.md`

## 分层模型

```text
themes/builtin/codex/theme.cardo-theme.json   ← L0 tokens
        ↓ applyTheme → --cardo-* + data-cardo-theme + data-cardo-chrome-material
src/web/styles/**/*.css                       ← 通用组件只消费变量
src/web/styles/themes/chrome-material.css     ← material 共享规则
src/web/styles/themes/codex/…                 ← 官方结构方言 recipe
```

- JSON 管可序列化 token；`applyTheme` 写到 `documentElement`。
- 通用 CSS 禁止按主题 id 分叉业务结构。
- 仅当 tokens 表达不了结构差异时，才写 recipe（选择器挂在 `[data-cardo-theme="<id>"]` 下）。

## 官方主题

| id | 名称 | material | 说明 |
| --- | --- | --- | --- |
| `codex` | Codex（唯一官方默认） | solid | 侧栏壳 / 主面板方言 |

### 包文件

```text
themes/builtin/
  codex/theme.cardo-theme.json
```

### Recipe 文件

```text
src/web/styles/themes/
  index.css
  shared.css
  chrome-material.css
  codex/index.css
```

用户可向数据目录 `themes/` 放置自定义 pack；官方 id 保留，磁盘同名忽略。

校验：`npm run validate:themes`
