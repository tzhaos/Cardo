# Cardo UI (`src/web/kit`)

产品 UI 唯一公开控件面。图标仅 Lucide。

## 推荐导入（路径可发现）

```ts
import { Button } from '../kit/button';
import { NavItem } from '../kit/nav-item';
import { ThemeIcon } from '../kit/icon';
import { IconButton } from '../kit/icon-button';
import { SettingsCard, SettingsRow } from '../kit/settings-form';
```

兼容 barrel：

```ts
import { Button, NavItem, ThemeIcon } from '../kit';
```

## 禁止

- `kit/internal/**`
- Fluent / Material 图标包
- 业务里自造按钮皮肤（先扩组件）

## 分层

| 层 | 路径 |
| --- | --- |
| 语义组件 | `components/*` + 根路径 re-export |
| 内部原语 | `internal/primitives`（Radix） |
| 图标 | `internal/icons`（Lucide） |
| 样式 | `styles/kit-base.css` + `styles/themes/codex.css` |

类名统一 `cardo-*`。组件 data 属性统一 `data-cardo-ui`。

设置表单：`SettingsCard`（分组）+ `SettingsRow`（行）消费产品 `cardo-settings-*` 类，与官方主题 recipe 对齐。

范式：`docs/architecture/cardo-ui-system-paradigm.md`  
Kit 契约：`docs/architecture/cardo-ui-kit.md`
