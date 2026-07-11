# Cardo Theme Packs

内置主题与用户主题使用同一套文件格式与目录约定。产品只负责加载与校验，不在 TSX 里手写色板。

## 目录结构

### 内置主题（仓库 / 产品包）

```text
themes/builtin/
  classic/
    theme.cardo-theme.json
  github/
    theme.cardo-theme.json
  …
```

- 每个主题一个目录，目录名建议与 `pack.id` 一致。
- 入口文件必须是 `theme.cardo-theme.json`。
- 客户端通过 Vite 打包加载这些文件；改主题请改 JSON，不要改 TS 常量。

### 用户主题（本机数据目录）

把主题放到 Cardo 数据目录下的 `themes` 文件夹后，Runtime 扫描并加入注册表（需重新打开或触发 preferences 同步）。

| 平台 | 路径 |
| --- | --- |
| Windows | `%APPDATA%\cardo\themes\` |
| macOS | `~/Library/Application Support/cardo/themes/` |
| Linux | `~/.config/cardo/themes/` |
| 覆盖 | 环境变量 `CARDO_DATA_DIR/themes` |

合法布局（二选一）：

```text
# 推荐：目录包
themes/
  my-theme/
    theme.cardo-theme.json

# 也可：单文件
themes/
  my-theme.cardo-theme.json
```

非法或会被忽略的情况：

- 缺少入口文件 / JSON 解析失败 / Zod 校验失败
- `pack.id` 与官方内置 id 冲突（`classic`、`github`、`one`、`nord`、`solarized`、`paper`、`graphite`、`material`、`apple`、`windows`）
- 文件超过约 256KB
- 同 id 重复出现（先扫到的生效）

## 文件格式

根对象必须是文档信封（推荐）或裸 Theme Pack。

```json
{
  "format": "cardo-theme",
  "version": 1,
  "pack": {
    "id": "my-theme",
    "version": "1.0.0",
    "name": { "en": "My Theme", "zh": "我的主题" },
    "description": { "en": "…", "zh": "…" },
    "tokens": {
      "colors": {
        "light": { "…": "所有 light 语义色" },
        "dark": { "…": "所有 dark 语义色" }
      },
      "fonts": { "sans": "…", "mono": "…", "sizeBase": "14px", "lineHeightBase": "1.45" },
      "radii": { "xs": "4px", "sm": "6px", "md": "10px", "lg": "12px", "xl": "16px", "pill": "999px" },
      "space": { "1": "4px", "2": "8px", "3": "12px", "4": "16px", "5": "20px", "6": "24px", "7": "32px", "8": "40px" },
      "elevation": {
        "light": { "shadow": "…", "shadowHover": "…", "insetShadow": "…" },
        "dark": { "shadow": "…", "shadowHover": "…", "insetShadow": "…" }
      },
      "motion": { "durationFast": "120ms", "durationNormal": "160ms", "easing": "ease" },
      "chrome": { "blur": "18px", "topbarOffset": "12px" }
    },
    "options": [],
    "layoutProfileId": "classic",
    "cssSnippet": "/* 可选：挂在 [data-cardo-theme] 下的结构样式 */"
  }
}
```

### 必填

| 字段 | 规则 |
| --- | --- |
| `format` | 固定 `"cardo-theme"` |
| `version` | 固定 `1` |
| `pack.id` | 字母数字，可含 `._-`，且不以分隔符开头 |
| `pack.version` | 非空字符串 |
| `pack.name.en` / `pack.name.zh` | 显示名 |
| `pack.tokens.colors.light` | 完整语义色板 |
| `pack.tokens.colors.dark` | 完整语义色板（双模式均必须） |

语义色键包括：`canvas`、`surface`、`surfaceStrong`、`panel`、`panelBottom`、`panelContent`、`panelChrome`、`border`、`borderSubtle`、`divider`、`text`、`softText`、`secondaryText`、`muted`、`hover`、`active`、`input`、`itemHover`、`glyph`、`neutralButton`、`neutralButtonHover`、`createBackground`、`createText`、`scrollbar`、`scrollbarHover`、`selectionRing`，以及可选强调色 `blue` / `orange` / `purple` / `emerald` / `red`。

### 推荐

- 同时写满 light + dark，不要只做“换色滤镜”。
- 主题气质主要靠材质：`radii`、`elevation`、`chrome.blur`、边框语言、header/content 分层；产品级 recipe 也走这一路。
- 字体要慎重：默认沿用产品 UI 无衬线栈（Inter + 中文 fallback）。不要把整站标题改成等宽或衬线来“假装主题感”——等宽只留给代码/色值等真正的 mono 场景。系统主题（如 Apple）可用系统栈；其它经典主题优先不改 `fonts.sans`。
- `cssSnippet` 中选择器尽量带 `[data-cardo-theme="your-id"]`；注入时会包在 `[data-cardo-root]` 下。禁止 `@import`、远程 `url(http…)` 等危险构造。

## 从内置主题起步

1. 复制 `themes/builtin/classic/`（或你喜欢的官方主题）到用户 `themes/my-theme/`。
2. 改 `pack.id` 为唯一新 id（禁止占用官方 id）。
3. 改 `name` / 色板 / 圆角 / `cssSnippet`。
4. 保存后重启 Runtime 或重新打开 Cardo，在设置里选择新主题。

也可在设置中通过文件导入 `.cardo-theme.json`（同一校验）。

## 契约源码

- Zod：`src/core/contracts/themePack.ts`
- 解析：`src/core/contracts/themePackIO.ts`
- 内置加载：`src/web-next/themes/builtInPacks.ts`
- 用户目录扫描：`src/runtime/localThemePacks.ts`
