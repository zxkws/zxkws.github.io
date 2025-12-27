# 前端主题系统设计报告（Theme System Report）

适用范围：`zxkws.github.io` 微前端 monorepo（`packages/main-app`、`packages/v-app` 及其它子应用）

目标：提供一套可复用、可扩展、支持浅色/深色模式的“主题（Theme）”设计，包括字体、字号（Typography）、颜色（Color）、间距/圆角/阴影（Layout & Elevation）、动效（Motion）等，并给出与 Tailwind/CSS Modules/原生 CSS 的落地方式。

---

## 1. 设计目标与原则

**目标**

1. 统一：跨 React/Vue/静态子应用的视觉一致性（尤其是微前端场景）。
2. 可切换：运行时快速切换浅色/深色主题（并能持久化）。
3. 可维护：避免散落的 hardcode（颜色/字号/间距），用 token 做单一事实来源（SSOT）。
4. 可扩展：后续新增「高对比」「节日皮肤」「品牌定制」时，只需替换 token。

**原则**

- 先语义、后具体：优先定义语义 token（如 `--color-fg`、`--color-border`），再映射到色板 token（如 `--slate-800`）。
- 兼容现状：保留并“别名（alias）”现有变量（`main-app` 的 `--accent` 等；`v-app` 的 `--accent-color` 等），降低迁移成本。
- 不绑定框架：主题以 CSS Variables 表达，Tailwind/LESS/CSS Modules 都能用。
- 默认可访问：文本/背景需满足基本对比度（建议正文 ≥ 4.5:1，非正文 ≥ 3:1）。

---

## 2. 主题组织方式（推荐）

建议将主题抽成一个可共享的文件（以便各子应用复用）：

- 推荐：`packages/shared-theme/theme.css`（新建），各应用入口引入
- 备选：每个应用各自维护，但共享同一份 token 规范（不推荐，容易漂移）

**深色模式选择器（建议兼容两种写法）**

- `html[data-theme="dark"]`：与 `main-app` 现状一致
- `html.dark`：与 Tailwind 默认 dark class 生态一致（`v-app` 现状）

推荐在实现侧做到“双写”，或在 CSS 中用并集选择器：

```css
html[data-theme="dark"],
html.dark {
  /* dark tokens */
}
```

---

## 3. Token 命名规范与层级

为了让 token 可扩展、可读、可检索，建议分三层：

1. **色板/基础（Primitives）**：`--slate-50`、`--sky-500` 等（可选，但利于统一）
2. **语义（Semantics）**：`--color-canvas`、`--color-fg`、`--color-primary` 等（强烈建议）
3. **组件级（Component）**：`--button-height-md`、`--card-radius` 等（按需）

命名建议：

- 颜色：`--color-*`（语义），`--slate-*` / `--sky-*`（色板）
- 字体：`--font-*`
- 字号：`--text-*`（尺寸），`--leading-*`（行高），`--tracking-*`（字距）
- 间距：`--space-*`
- 圆角：`--radius-*`
- 阴影：`--shadow-*`
- 动效：`--duration-*`、`--ease-*`
- 层级：`--z-*`

---

## 4. 主题 Token（推荐默认值）

> 说明：以下给出“默认主题（Glass Tech）”的建议值，尽量与现有 `main-app/src/global.css` 的视觉风格保持一致，并补齐缺失项。

### 4.1 色板（Primitives，可选但推荐）

**Slate（与 Tailwind Slate 对齐）**

| Token | Hex |
| --- | --- |
| `--slate-50` | `#f8fafc` |
| `--slate-100` | `#f1f5f9` |
| `--slate-200` | `#e2e8f0` |
| `--slate-300` | `#cbd5e1` |
| `--slate-400` | `#94a3b8` |
| `--slate-500` | `#64748b` |
| `--slate-600` | `#475569` |
| `--slate-700` | `#334155` |
| `--slate-800` | `#1e293b` |
| `--slate-900` | `#0f172a` |
| `--slate-950` | `#020617` |

**Primary（Sky，沿用现有 Tailwind 配置值）**

| Token | Hex |
| --- | --- |
| `--sky-50` | `#f0f9ff` |
| `--sky-100` | `#e0f2fe` |
| `--sky-200` | `#bae6fd` |
| `--sky-300` | `#7dd3fc` |
| `--sky-400` | `#38bdf8` |
| `--sky-500` | `#0ea5e9` |
| `--sky-600` | `#0284c7` |
| `--sky-700` | `#0369a1` |
| `--sky-800` | `#075985` |
| `--sky-900` | `#0c4a6e` |
| `--sky-950` | `#082f49` |

**Secondary（Indigo，用于渐变/强调的第二色）**

| Token | Hex |
| --- | --- |
| `--indigo-50` | `#eef2ff` |
| `--indigo-100` | `#e0e7ff` |
| `--indigo-200` | `#c7d2fe` |
| `--indigo-300` | `#a5b4fc` |
| `--indigo-400` | `#818cf8` |
| `--indigo-500` | `#6366f1` |
| `--indigo-600` | `#4f46e5` |
| `--indigo-700` | `#4338ca` |
| `--indigo-800` | `#3730a3` |
| `--indigo-900` | `#312e81` |
| `--indigo-950` | `#1e1b4b` |

### 4.2 语义色（Semantics，建议作为唯一使用入口）

推荐把浅色/深色两套语义 token 放在同一份 CSS 里。

```css
/* Theme: Glass Tech (Default) */
:root {
  color-scheme: light;

  /* ---- Typography ---- */
  --font-sans: "Inter", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei",
    system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans",
    "Helvetica Neue", Arial, sans-serif;
  --font-display: "Lexend", "Inter", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco,
    Consolas, "Liberation Mono", monospace;

  /* ---- Type scale (rem, base 16px) ---- */
  --text-xs: 0.75rem;   /* 12 */
  --text-sm: 0.875rem;  /* 14 */
  --text-md: 1rem;      /* 16 */
  --text-lg: 1.125rem;  /* 18 */
  --text-xl: 1.25rem;   /* 20 */
  --text-2xl: 1.5rem;   /* 24 */
  --text-3xl: 1.875rem; /* 30 */
  --text-4xl: 2.25rem;  /* 36 */

  --leading-xs: 1rem;
  --leading-sm: 1.25rem;
  --leading-md: 1.5rem;
  --leading-lg: 1.75rem;
  --leading-xl: 1.75rem;
  --leading-2xl: 2rem;
  --leading-3xl: 2.25rem;
  --leading-4xl: 2.5rem;

  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  --tracking-tight: -0.01em;
  --tracking-normal: 0;
  --tracking-wide: 0.01em;

  /* ---- Layout scale ---- */
  --space-0: 0;
  --space-1: 0.25rem;  /* 4 */
  --space-2: 0.5rem;   /* 8 */
  --space-3: 0.75rem;  /* 12 */
  --space-4: 1rem;     /* 16 */
  --space-5: 1.25rem;  /* 20 */
  --space-6: 1.5rem;   /* 24 */
  --space-8: 2rem;     /* 32 */
  --space-10: 2.5rem;  /* 40 */
  --space-12: 3rem;    /* 48 */
  --space-16: 4rem;    /* 64 */

  --radius-sm: 0.375rem; /* 6 */
  --radius-md: 0.5rem;   /* 8 */
  --radius-lg: 0.75rem;  /* 12 */
  --radius-xl: 1rem;     /* 16 */
  --radius-2xl: 1.5rem;  /* 24 (stage/iframe) */

  --shadow-sm: 0 1px 2px rgba(2, 6, 23, 0.06);
  --shadow-md: 0 8px 24px rgba(2, 6, 23, 0.10);
  --shadow-lg: 0 24px 60px rgba(2, 6, 23, 0.14);

  /* ---- Motion ---- */
  --duration-fast: 150ms;
  --duration-base: 220ms;
  --duration-slow: 360ms;
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-emphasized: cubic-bezier(0.2, 0, 0, 1);

  /* ---- Color primitives (optional) ---- */
  --slate-50: #f8fafc;
  --slate-100: #f1f5f9;
  --slate-200: #e2e8f0;
  --slate-300: #cbd5e1;
  --slate-400: #94a3b8;
  --slate-500: #64748b;
  --slate-600: #475569;
  --slate-700: #334155;
  --slate-800: #1e293b;
  --slate-900: #0f172a;
  --slate-950: #020617;

  --sky-50: #f0f9ff;
  --sky-100: #e0f2fe;
  --sky-200: #bae6fd;
  --sky-300: #7dd3fc;
  --sky-400: #38bdf8;
  --sky-500: #0ea5e9;
  --sky-600: #0284c7;
  --sky-700: #0369a1;
  --sky-800: #075985;
  --sky-900: #0c4a6e;
  --sky-950: #082f49;

  --indigo-400: #818cf8;
  --indigo-500: #6366f1;

  /* ---- Semantic colors ---- */
  --color-canvas: var(--slate-100);
  --color-surface: rgba(255, 255, 255, 0.75);      /* card/glass */
  --color-surface-strong: rgba(255, 255, 255, 0.85); /* stage/dialog */
  --color-overlay: rgba(2, 6, 23, 0.45);            /* modal mask */

  --color-fg: var(--slate-800);
  --color-fg-muted: var(--slate-500);
  --color-fg-subtle: var(--slate-600);
  --color-placeholder: rgba(100, 116, 139, 0.75);

  --color-border: rgba(255, 255, 255, 0.60);
  --color-border-strong: rgba(226, 232, 240, 0.90);

  --color-primary: var(--sky-500);
  --color-primary-hover: var(--sky-600);
  --color-primary-active: var(--sky-700);
  --color-primary-fg: #ffffff;
  --color-primary-glow: rgba(14, 165, 233, 0.30);

  --color-secondary: var(--indigo-500);
  --color-secondary-glow: rgba(99, 102, 241, 0.20);

  --color-focus-ring: rgba(14, 165, 233, 0.35);
  --color-danger: #ef4444;
  --color-warning: #f59e0b;
  --color-success: #10b981;
  --color-info: #06b6d4;

  /* ---- Glass system (alias) ---- */
  --glass-surface: var(--color-surface);
  --glass-border: var(--color-border);
  --glass-shadow: 0 8px 32px rgba(31, 38, 135, 0.07);

  /* ---- Stage (alias) ---- */
  --stage-bg: var(--color-surface-strong);
  --stage-shadow: 0 24px 60px -12px rgba(50, 50, 93, 0.15),
    0 12px 24px -16px rgba(0, 0, 0, 0.10);

  /* ---- Backward compatible aliases (main-app) ---- */
  --color-bg: var(--color-canvas);
  --color-text: var(--color-fg);
  --color-muted: var(--color-fg-muted);
  --color-muted-strong: var(--color-fg-subtle);
  --accent: var(--color-primary);
  --accent-glow: var(--color-primary-glow);
  --card-bg: var(--glass-surface);
  --header-border: var(--glass-border);

  /* ---- Backward compatible aliases (v-app) ---- */
  --bg-primary: transparent;
  --bg-secondary: var(--color-surface);
  --text-primary: var(--color-fg);
  --text-secondary: var(--color-fg-muted);
  --accent-color: var(--color-primary);
  --border-color: var(--color-border-strong);
  --glass-bg: var(--glass-surface);
  --shadow-glow: 0 4px 20px rgba(14, 165, 233, 0.15);

  /* ---- Z-index ---- */
  --z-base: 0;
  --z-dropdown: 1000;
  --z-sticky: 1100;
  --z-modal: 2000;
  --z-toast: 3000;
}

html[data-theme="dark"],
html.dark {
  color-scheme: dark;

  --color-canvas: var(--slate-950);
  --color-surface: rgba(15, 23, 42, 0.70);
  --color-surface-strong: rgba(30, 41, 59, 0.45);
  --color-overlay: rgba(2, 6, 23, 0.72);

  --color-fg: var(--slate-50);
  --color-fg-muted: var(--slate-400);
  --color-fg-subtle: var(--slate-300);
  --color-placeholder: rgba(148, 163, 184, 0.75);

  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-strong: rgba(255, 255, 255, 0.14);

  --color-primary: var(--sky-400);
  --color-primary-hover: var(--sky-300);
  --color-primary-active: var(--sky-200);
  --color-primary-fg: #001018;
  --color-primary-glow: rgba(56, 189, 248, 0.30);

  --color-secondary: var(--indigo-400);
  --color-secondary-glow: rgba(129, 140, 248, 0.22);

  --color-focus-ring: rgba(56, 189, 248, 0.35);

  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.40);
  --stage-shadow: 0 24px 60px -12px rgba(0, 0, 0, 0.50);
}
```

**使用建议**

- 所有新 UI 优先使用语义 token（`--color-*`、`--text-*`、`--space-*` 等），避免直接引用 `--sky-*` / `--slate-*`。
- 需要渐变/发光效果时，使用 `--color-primary-glow`、`--color-secondary-glow`，避免各处随意写 `rgba(...)`。
- 组件背景分层建议：
  - 页面底色：`--color-canvas`
  - 卡片/玻璃：`--color-surface` / `--glass-surface`
  - 弹层/对话框：`--color-surface-strong` / `--stage-bg`

### 4.3 文字样式（Typography 的用法约定）

推荐将字体使用分成 3 类：UI 正文、标题/展示、代码/数据。

- 正文（Body）：`font-family: var(--font-sans); font-size: var(--text-md); line-height: var(--leading-md);`
- 小字（Caption）：`var(--text-sm)` 或 `var(--text-xs)`（避免过度使用 12px）
- 标题（Heading）：`var(--font-display)` + `var(--text-xl)` ~ `var(--text-4xl)`
- 代码/数字（Mono）：`var(--font-mono)`

推荐的标题层级示例（可按实际微调）：

| 层级 | font-size | line-height | weight | 典型用途 |
| --- | --- | --- | --- | --- |
| H1 | `--text-4xl` | `--leading-4xl` | `--weight-bold` | 页面主标题 |
| H2 | `--text-3xl` | `--leading-3xl` | `--weight-semibold` | 模块标题 |
| H3 | `--text-2xl` | `--leading-2xl` | `--weight-semibold` | 卡片标题 |
| H4 | `--text-xl` | `--leading-xl` | `--weight-medium` | 小节标题 |

---

## 5. Tailwind 落地建议（对齐现有用法）

当前项目已在 `main-app` / `v-app` 使用 Tailwind，并且部分地方使用了 `bg-[var(--...)]` 形式的 arbitrary values。为了更好维护，建议逐步把“常用语义色”映射为 Tailwind colors，减少每次都写 `bg-[var(--color-canvas)]`。

示例（思路，按实际 Tailwind 版本/配置调整）：

```js
// tailwind.config.js
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        fg: 'var(--color-fg)',
        muted: 'var(--color-fg-muted)',
        border: 'var(--color-border)',
        primary: 'var(--color-primary)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
      borderRadius: {
        stage: 'var(--radius-2xl)',
      },
      boxShadow: {
        md: 'var(--shadow-md)',
      },
    },
  },
};
```

这样在组件里就能写：

- `bg-canvas text-fg border-border`
- `bg-surface`
- `text-muted`
- `bg-primary text-[var(--color-primary-fg)]`

---

## 6. 微前端一致性建议（重要）

如果微应用以 `iframe` 方式加载，父应用的 CSS Variables **不会**自动影响子应用的 document。为了保证一致性，建议：

1. 每个微应用都引入同一份 `theme.css`（最简单，最稳定）。
2. 主题切换时，主应用通过 `postMessage` 把主题名（`light/dark`）广播给子应用；子应用收到后同步设置 `html[data-theme]` 或 `html.classList.toggle('dark')`。

---

## 7. 迁移与兼容策略（建议分阶段）

**阶段 1：仅补齐 token，不破坏现有变量**

- 保留 `main-app` 的 `--accent` / `--color-bg` 等，新增语义 token 并用 alias 兼容（见上方 CSS 示例）。
- 保留 `v-app` 的 `--accent-color` / `--bg-secondary` 等，同样 alias 到新 token。

**阶段 2：新增 UI 全部使用新语义 token**

- 新组件只允许使用 `--color-*`、`--space-*`、`--radius-*`、`--shadow-*` 等。

**阶段 3：逐步替换旧变量（可选）**

- 当旧变量使用点趋近于 0 时，再考虑移除或收敛。

---

## 8. 自检清单（交付前建议）

1. 浅色/深色下：正文文本对比度（至少 4.5:1）是否达标。
2. 交互态：按钮 hover/active/focus 是否一致，focus ring 是否清晰。
3. 阴影与玻璃：在深色模式下是否过“脏”（对比、透明度、阴影强度）。
4. 微前端：主应用切主题后，子应用是否同步。
5. 统一性：新页面是否仍出现硬编码颜色/字号/间距。

