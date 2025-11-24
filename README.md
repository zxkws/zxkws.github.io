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
