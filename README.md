# 微前端项目 - Development 分支

这是一个基于微前端架构的项目，包含主应用和多个子应用。

## 项目结构

```
├── packages/
│   ├── main-app/          # 主应用 (React + icestark)
│   ├── rc-app/            # React 子应用
│   ├── v-app/             # Vue 子应用
│   ├── micro-lib/         # 微前端库
│   └── utils/             # 工具库
├── sub-app/               # 构建后的子应用
├── scripts/               # 脚本文件
└── textDifference/        # 文本对比工具
```

## 技术栈

- **主应用**: React 18 + TypeScript + Webpack + icestark
- **React子应用**: React 18 + TypeScript + Vite + Tailwind CSS
- **Vue子应用**: Vue 3 + TypeScript + Vite + Tailwind CSS + Pinia
- **构建工具**: Webpack 5, Vite
- **包管理**: pnpm workspace

## 开发指南

### 环境要求

- Node.js >= 16
- pnpm >= 8

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# 启动主应用
cd packages/main-app
pnpm dev

# 启动React子应用
cd packages/rc-app
pnpm start

# 启动Vue子应用
cd packages/v-app
pnpm vite
```

### 构建

```bash
# 构建所有应用
pnpm build

# 构建特定应用
cd packages/main-app && pnpm build
cd packages/rc-app && pnpm build
cd packages/v-app && pnpm build
```

## 新功能 (Development 分支)

### 1. 改进的开发体验
- 统一的开发脚本
- 更好的错误处理
- 热重载支持

### 2. 增强的UI组件
- 统一的设计系统
- 响应式布局改进
- 更好的用户体验

### 3. 性能优化
- 代码分割优化
- 懒加载改进
- 缓存策略优化

## 部署

项目支持部署到以下平台：
- Netlify (推荐)
- Vercel
- GitHub Pages

### Netlify 部署

```bash
# 构建项目
pnpm build

# 部署到 Netlify
# 构建命令: pnpm build
# 发布目录: packages/main-app/build
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

MIT License

## 更新日志

### v2.0.0 (Development)
- 🎉 新增Vue 3子应用
- 🚀 性能优化和代码分割
- 🎨 UI/UX改进
- 🔧 开发工具链优化
- 📱 响应式设计改进

### v1.0.0
- ✨ 初始版本
- 🏗️ 微前端架构搭建
- 📦 React主应用和子应用