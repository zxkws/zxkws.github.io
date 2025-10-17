# Micro Frontend Monorepo

这是一个基于微前端架构的 monorepo 项目，包含主应用和多个微应用。

## 项目结构

```
packages/
├── main-app/          # 主应用（React）
├── v-app/             # Vue 微应用
└── textDifference/    # 文本对比工具微应用
```

## 部署架构

- **主应用**: 部署到根路径 `/`
- **v-app**: 部署到子路径 `/v-app/`
- **textDifference**: 部署到子路径 `/textdiff/`

所有应用通过 GitHub Actions 自动构建并部署到 GitHub Pages。

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

主应用会自动加载本地开发中的微应用，实现实时热更新。

### 方式二：单独开发

如果只需要开发某个应用：

```bash
# 只开发主应用
pnpm dev:main

# 只开发 v-app 微应用
pnpm dev:v-app

# 只开发 textDifference 微应用
pnpm dev:textdiff
```

### 端口说明

| 应用           | 开发端口 | 访问地址              |
| -------------- | -------- | --------------------- |
| main-app       | 3000     | http://localhost:3000 |
| v-app          | 5173     | http://localhost:5173 |
| textDifference | 5174     | http://localhost:5174 |

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
pnpm --filter textdifference build
```

## 部署

推送到 `development` 分支后，GitHub Actions 会自动构建并部署所有应用到 GitHub Pages。

## 技术栈

- **主应用**: React + ice-stark + Webpack
- **v-app**: Vue 3 + Vite + Pinia
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
