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

### 开发主应用

```bash
cd packages/main-app
pnpm dev
```

### 开发 v-app 微应用

```bash
cd packages/v-app
pnpm vite
```

## 构建

### 构建所有应用

```bash
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

## 参考文档

- [ice-stark 微前端框架](https://micro-frontends.ice.work/docs/guide/)
- [Tailwind CSS](https://tailwindui.starxg.com/components)
- [shadcn-vue](https://www.shadcn-vue.com/docs/introduction.html)
- [Tailwind Generator](https://tailwind-generator.com/generators)