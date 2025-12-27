# 共享主题文件落地计划（Theme Extraction Plan）

适用范围：`zxkws.github.io`（pnpm workspace，`packages/**`）

目标：将主题（字体/字号/颜色/间距/圆角/阴影/动效等 token）抽成一份可复用的共享文件，并在主应用与微应用中统一接入，保证浅色/深色模式一致且可同步。

参考设计稿：`report.md`

---

## 一、现状与关键点

1. `main-app` 通过 `html[data-theme]` 控制深色模式，并在 `src/global.css` 内定义了一套 CSS 变量（token + 部分全局样式）。
   - 入口：`packages/main-app/src/app.tsx:21`
   - 主题变量：`packages/main-app/src/global.css:1`
2. `v-app` 通过 `html.dark` 控制深色模式（Pinia 存储 `theme`），`src/style/style.css` 内也维护了一套变量与全局样式。
   - 入口：`packages/v-app/src/main.ts:9`
   - 主题变量：`packages/v-app/src/style/style.css:8`
3. 微前端场景下，如果子应用运行在 `iframe`，父应用的 CSS Variables 不会自动影响子应用，需要“各自引入主题文件”或“消息同步主题状态”。

---

## 二、交付物（建议）

### 1) 新增共享主题包（推荐方式）

新增：`packages/shared-theme/`

包含文件（建议最小集合）：

1. `packages/shared-theme/package.json`
   - `name`: `@zxkws/shared-theme`
   - `version`: `0.1.0`
   - `files`: `["theme.css"]`
   - `sideEffects`: 建议为 `["*.css"]`（避免构建时被错误 tree-shaking）
2. `packages/shared-theme/theme.css`
   - 只放“主题 token + 兼容 alias + 深浅色切换选择器”，不放应用特有布局/背景动画等样式
   - 深色选择器同时兼容：`html[data-theme="dark"]` 与 `html.dark`

### 2) 应用侧保留的内容（不进入 shared-theme）

1. `main-app` 的背景动画、布局相关变量（如 `--layout-*`）等，留在 `packages/main-app/src/global.css`。
2. `v-app` 的 `.cards`/`.glass` 等工具类与页面级样式，留在 `packages/v-app/src/style/style.css`。

---

## 三、实施步骤（分阶段）

### Phase 1：创建 shared-theme 并落入 token

1. 新建 `packages/shared-theme/theme.css`，从两处抽取并合并：
   - `packages/main-app/src/global.css:1` 的 token 部分
   - `packages/v-app/src/style/style.css:8` 的 token 部分
2. 按 `report.md` 的建议，补齐语义 token（`--color-*`、`--font-*`、`--text-*`、`--space-*`、`--radius-*`、`--shadow-*`、`--duration-*` 等）。
3. 添加兼容 alias（减少迁移成本）：
   - main-app：`--accent`、`--color-bg`、`--color-text`、`--glass-*`、`--stage-*` 等
   - v-app：`--accent-color`、`--bg-secondary`、`--text-primary` 等
4. 把当前 main-app 里引用但未定义的 token 补齐（例如 `--spinner-track` / `--spinner-head`，用于加载动画）。
   - 使用点：`packages/main-app/src/app.tsx:48`、`packages/main-app/src/components/PageLoading/index.tsx:18`

验收标准：
- 不改任何业务页面代码，也能保持现有浅色/深色观感“基本一致”（允许轻微差异）。

### Phase 2：main-app 接入 shared-theme

1. `packages/main-app/package.json` 添加依赖：`"@zxkws/shared-theme": "workspace:*"`
2. 在入口引入共享主题（建议在所有应用样式之前）：
   - `packages/main-app/src/app.tsx:21` 附近新增：`import '@zxkws/shared-theme/theme.css';`
3. 精简 `packages/main-app/src/global.css`：
   - 移除 `:root` 与深色主题块中“仅 token 定义”的部分（已迁移到 shared-theme）
   - 保留 reset/背景动画/容器布局等与主题无关或应用专属的样式
4. Tailwind darkMode 对齐（可选但推荐）：
   - 当前 `packages/main-app/tailwind.config.js` 使用 `darkMode: 'class'`，但 main-app 实际切换是 `data-theme`
   - 建议改为同时支持：`class` + `[data-theme="dark"]`（避免后续 `dark:` 类失效）

验收标准：
- main-app 切换主题（`data-theme`）仍生效；页面无明显样式缺失；控制台无样式相关报错。

### Phase 3：v-app 接入 shared-theme

1. `packages/v-app/package.json` 添加依赖：`"@zxkws/shared-theme": "workspace:*"`
2. 在入口引入共享主题：
   - `packages/v-app/src/main.ts:9` 附近新增：`import '@zxkws/shared-theme/theme.css';`
3. 精简 `packages/v-app/src/style/style.css`：
   - 移除 `:root` 与 `html.dark` 的 token 定义（已迁移到 shared-theme）
   - 保留 `.cards`/`.glass`/滚动条/动画等工具类与应用专属样式
   - `font-family` 统一改用 `var(--font-sans)`
4. 保持现有主题切换逻辑不变：
   - `packages/v-app/src/hooks/useTheme.ts:1` 仍通过 `html.dark` 切换（shared-theme 已兼容）

验收标准：
- v-app 独立访问与作为微应用访问时，浅色/深色都能正确渲染；主题切换无闪烁或闪白（可接受轻微）。

### Phase 4：微前端主题同步（建议做，避免“父子主题不一致”）

场景：主应用切换主题后，iframe 内的微应用无法自动跟随。

建议方案（二选一）：

1. 简单方案：主应用在切换主题时 `postMessage` 广播给所有 iframe；子应用监听并应用主题
   - 主应用发送：`{ type: 'ZXKWS_THEME_CHANGE', theme: 'light' | 'dark' }`
   - 子应用接收后执行：设置 `html.dark` / `data-theme`，并更新各自的持久化存储（如 v-app 的 store）
2. 稳定方案：抽成 `@zxkws/shared-theme` 的 TS 辅助函数（可选）
   - `applyTheme(theme)`：同时写 `data-theme` 与 `.dark`
   - `broadcastTheme(theme)`：广播主题
   - `listenThemeChange(handler)`：统一监听

验收标准：
- 仅在主应用切换主题时，已加载的微应用能在 200ms 内同步切换（无须刷新）。

### Phase 5：扩展到其它子应用（可选）

优先级建议：

1. `packages/v-react`（React + Vite）
2. `packages/auth-app`
3. `packages/person-resume-app`
4. `packages/react-learning-app` / `packages/vue-learning-app`
5. `packages/textDifference`（纯静态，按需）

策略：
- 先“只引入共享主题 + 保持旧样式”，再逐步替换硬编码颜色/字号为语义 token。

---

## 四、验证清单（建议每个 Phase 完成后执行）

1. 本地启动：`pnpm dev`（主应用 + 常用微应用）
2. 主题切换：
   - main-app：切换 `data-theme`
   - v-app：切换 `html.dark`（light/dark/system）
3. 关键页面抽查：
   - main-app：带 `bg-[var(--...)]` 的页面/组件
   - v-app：常用表格页（Surely Table）、侧边栏、弹层
4. 构建验证：`pnpm build:all`（如时间允许）

---

## 五、风险与回滚

**风险**

1. CSS 导入顺序改变导致 token 被覆盖/缺失。
2. `@zxkws/shared-theme` 若配置不当，构建时 CSS 被 tree-shaking 掉（重点关注 `sideEffects`）。
3. 深色模式选择器不统一导致 `dark:` 类与变量主题不一致。
4. iframe 微应用主题不同步导致体验割裂。

**回滚策略**

1. 保留 app 内原 token 定义（先不删除，只做迁移验证分支），通过开关逐步切换。
2. 出现严重样式回归时：先恢复 `main-app/src/global.css` 与 `v-app/src/style/style.css` 的 token 定义，再排查 shared-theme 合并差异。

