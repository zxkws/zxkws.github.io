# Micro Frontend Monorepo

这是一个基于微前端架构的 monorepo 项目，包含主应用和多个微应用。

## 项目结构

```
packages/
├── main-app/             # 主应用（React）
├── v-app/                # Vue 微应用
├── pdf-editor-app/       # PDF 编辑器（React + Vite）
├── textDifference/       # 文本对比工具微应用
├── config-center/        # 微应用配置中心（静态配置）
├── config-hub/           # 配置管理微应用
├── vue-learning-app/     # Vue 学习示例
├── react-learning-app/   # React 学习示例
├── knowledge-hub-app/    # 知识中台
├── codex-chat-app/       # Codex 对话（实验）
└── person-resume-app/    # 个人简历（实验）
```

## 部署架构

- **主应用**: 部署到根路径 `/`
- **v-app**: 部署到子路径 `/v-app/`
- **pdf-editor-app**: 部署到子路径 `/pdf-editor-app/`
- **textDifference**: 部署到子路径 `/textdiff/`
- **config-center**: 部署到子路径 `/config-center/`
- **vue-learning-app**: 部署到子路径 `/vue-learning-app/`
- **react-learning-app**: 部署到子路径 `/react-learning-app/`
- **codex-chat-app**: 部署到子路径 `/codex-chat-app/`
- **knowledge-hub-app**: 部署到子路径 `/knowledge-hub-app/`
- **person-resume-app**: 部署到子路径 `/person-resume-app/`

所有上述应用通过 GitHub Actions 自动构建并部署到 GitHub Pages。

> 说明：`config-hub` 仍未加入自动部署矩阵，如需发布请在 `.github/workflows/main.yml` 中补充。

## 本地开发

### 安装依赖

```bash
pnpm install
```

### 方式一：同时开发所有应用（推荐）

一键启动主应用和所有微应用，支持热更新和微前端联调：

```bash
pnpm dev
```

此命令会并行启动：

- 主应用：`http://localhost:3000`
- v-app 微应用：`http://localhost:5173`
- textDifference 微应用：`http://localhost:5174`
- config-center 微应用：`http://localhost:5175`
- config-hub 微应用：`http://localhost:5176`
- pdf-editor-app 微应用：`http://localhost:5177`
- vue-learning-app 微应用：`http://localhost:5178`
- react-learning-app 微应用：`http://localhost:5179`
- knowledge-hub-app 微应用：`http://localhost:5180`
- person-resume-app 微应用：`http://localhost:5181`

主应用会自动加载本地开发中的微应用，实现实时热更新。

### 方式二：单独开发

如果只需要开发某个应用：

```bash
# 只开发主应用
pnpm dev:main

# 只开发 v-app 微应用
pnpm dev:v-app

# 只开发 pdf-editor-app 微应用
pnpm dev:pdf-editor

# 只开发 textDifference 微应用
pnpm dev:textdiff

# 只开发 person-resume-app 微应用
pnpm dev:resume
```

### 端口说明

| 应用               | 开发端口 | 访问地址              |
| ------------------ | -------- | --------------------- |
| main-app           | 3000     | http://localhost:3000 |
| v-app              | 5173     | http://localhost:5173 |
| textDifference     | 5174     | http://localhost:5174 |
| config-center      | 5175     | http://localhost:5175 |
| config-hub         | 5176     | http://localhost:5176 |
| pdf-editor-app     | 5177     | http://localhost:5177 |
| vue-learning-app   | 5178     | http://localhost:5178 |
| react-learning-app | 5179     | http://localhost:5179 |
| knowledge-hub-app  | 5180     | http://localhost:5180 |
| person-resume-app  | 5181     | http://localhost:5181 |

> 生产预览（构建后的静态产物）默认跑在 `417x` 端口，例如 `pnpm preview:pdf-editor` 后访问 `http://localhost:4177/pdf-editor-app/`。

### 本地开发特性

- ✅ 支持微前端联调（主应用自动加载本地微应用）
- ✅ 支持热更新（HMR）
- ✅ 自动配置 CORS
- ✅ 彩色日志输出，方便区分不同应用

## 构建

### 构建所有应用

```bash
# 使用统一命令
pnpm build:all

# 或者分别构建
pnpm --filter main-app build
pnpm --filter v-app build
pnpm --filter pdf-editor-app build
pnpm --filter textdifference build
pnpm --filter config-center build
pnpm --filter person-resume-app build
pnpm --filter vue-learning-app build
pnpm --filter react-learning-app build

# 生产包本地预览（示例：PDF 编辑器）
pnpm preview:pdf-editor  # 打开 http://localhost:4177/pdf-editor-app/
```

## 部署

推送到 `development` 分支后，GitHub Actions 会自动构建并部署所有应用到 GitHub Pages。

## 技术栈

- **主应用**: React + ice-stark + Webpack
- **v-app**: Vue 3 + Vite + Pinia
- **pdf-editor-app**: React + Vite + pdf-lib + pdfjs-dist
- **textDifference**: 纯静态 HTML/JS

## 微前端特性

### 菜单管理

主应用统一管理所有微应用的菜单：

- ✅ 微应用在主应用中隐藏自己的导航
- ✅ 微应用将菜单暴露给主应用
- ✅ 独立访问时显示完整导航
- ✅ 动态集成菜单配置

详细说明请查看 [菜单管理文档](./docs/MENU_MANAGEMENT.md)

### 环境检测

微应用自动检测运行环境：

```typescript
// 主应用环境: isMicroApp = true，隐藏导航
// 独立访问: isMicroApp = false，显示导航
```

## 参考文档

- [ice-stark 微前端框架](https://micro-frontends.ice.work/docs/guide/)
- [菜单管理机制](./docs/MENU_MANAGEMENT.md)
- [Tailwind CSS](https://tailwindui.starxg.com/components)
- [shadcn-vue](https://www.shadcn-vue.com/docs/introduction.html)
- [Tailwind Generator](https://tailwind-generator.com/generators)

## 待办：依赖集中管理改造（保持 pnpm 8 兼容）

> 背景：各子应用存在大量重复依赖（如 `@ice/stark-app`、`vite-plugin-index-html`、`vite`、`typescript`、`react`、`react-dom`、`@types/react`、`@types/react-dom` 等），但当前本地环境有项目依赖 pnpm 8.x，暂不升级到 9/10。

改造目标：在不升级 pnpm 的前提下，尽量做到“版本只改一处”，后续若升级到 pnpm ≥9.5 可切换 Catalogs。

计划步骤

- **阶段 1（pnpm 8 继续使用）**
  - 在根 `package.json` 的 `pnpm.overrides` 中统一上述重复依赖的版本；子包保留声明以满足 pnpm 8 的严格解析，但实际安装版本以 overrides 为准。
  - 在 `pnpm-lock.yaml` 已存在的情况下，执行 `pnpm install` 使锁文件对齐；观察是否有 breaking changes。
  - 为避免疏漏，写一个脚本列出重复依赖（示例：`node scripts/dup-deps.js`，逻辑等同于当前一次性统计脚本）。
  - 记录约定：新增子包/依赖时先改 overrides，再在子包声明同版本，确保一致性。

- **阶段 2（未来可升级到 pnpm ≥9.5 后执行）**
  - 在根 `package.json` 写入 `"packageManager": "pnpm@<version>"`，提升到支持 Catalogs 的版本。
  - 在 `pnpm-workspace.yaml` 添加 `catalog:`，集中写公共依赖版本；子包将重复依赖版本号改为 `"catalog:"` 前缀形式（如 `"vite": "catalog:"`）。
  - 删除不再需要的根 overrides，`pnpm install` 更新锁文件，验证各子应用启动/构建。

验证清单

- `pnpm install` 成功且无 hoist/strict 解析报错。
- `pnpm dev` 可正常并行启动所有微应用；抽样检查 2~3 个子应用构建（`pnpm --filter <app> build`）。
- 锁文件和根 overrides/Catalogs 变更提交前，确认无额外多余依赖被升级（对比 `pnpm list --depth 0`）。

风险/注意事项

- pnpm 8 不支持“仅根依赖可被子包自动消费”，子包必须保留各自依赖声明，否则运行时会报模块缺失。
- overrides 统一版本可能放大发布范围，升级前需看变更日志；如需回滚可在 overrides 单独 pin 旧版。
- 如果某子应用需要与全局不同版本（例如实验性包），需在该子包 `package.json` 中用 `pnpm.overrides` 局部覆盖，并在 README 记录原因。
