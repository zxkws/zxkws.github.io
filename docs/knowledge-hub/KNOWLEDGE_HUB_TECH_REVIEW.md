# 知识中台微应用技术评审

## 1. 架构概览

- **前端框架**：Vite + React + TypeScript，使用 `@ice/stark-app` 适配微前端主站。
- **模块划分**：
  - `App.tsx`：入口视图与 Tab 切换。
  - `data/mock.ts`：mock 数据与 API Schema，后续可替换成真实请求。
  - `types/knowledge.ts`：统一的领域类型定义，规范后端交互契约。
  - `styles.css` & `App.module.css`：统一 UI 皮肤与布局。
- **部署路径**：打包后挂载于 `/knowledge-hub-app/`，主站路由 `/app/knowledge-hub`。

## 2. 运行时依赖

| 依赖                 | 用途               |
| -------------------- | ------------------ |
| `react`, `react-dom` | 组件渲染           |
| `@ice/stark-app`     | 微前端生命周期封装 |

## 3. 构建链路

- `pnpm --filter knowledge-hub-app build` 触发 Vite 构建，输出 `entry.js` 与按需 chunk。
- Vite 配置 `base` 为 `/knowledge-hub-app/`，与配置中心的 `entry`、`prodEntry` 保持一致。
- dev server 使用 5180 端口，支持跨域头以便主站加载。

## 4. 与主应用的集成

- 配置中心 `micro-apps.json` 新增 `knowledge-hub-app` 项，主站拉取后自动注册。
- 主应用菜单 `menuConfig.ts` 添加“知识中台”入口，对应 `/app/knowledge-hub`。
- 根 `package.json` 增加 `dev:knowledge-hub` 与 build 链路，保证本地联调与批量构建。

## 5. 数据流与扩展性

- 目前所有数据源来自 `data/mock.ts`，结构已按照未来 API 的返回格式定义。
- 后续对接真实后端时可在 `App.tsx` 中引入数据请求层或 hooks，并复用现有类型。
- API Schema 通过 `backendServices` 表达，可直接驱动接口文档生成或导出。

## 6. 后端能力预期

- **knowledge-core-service**：负责知识空间 CRUD、Pipeline 调度、检索评估指标。
- **graph-reasoner-service**：负责 GraphRAG 推理、图谱构建与质量治理。
- 两者暴露的接口均在 API 规格中定义，包括参数、响应体、错误码。

## 7. 安全与鉴权考虑

- 前端展示层暂不处理鉴权，未来需结合主站的登录态在发起 API 请求时附带 Token。
- API 需在响应中进行租户隔离与字段级权限控制，避免敏感知识泄露。

## 8. 风险与应对

| 风险                       | 影响             | 应对                                    |
| -------------------------- | ---------------- | --------------------------------------- |
| 后端接口尚未实现           | 页面数据静态展示 | 维持 mock 数据，同时提供清晰的 API 规格 |
| 多模态数据量大导致渲染缓慢 | 页面卡顿         | 按需分页/虚拟化，当前 mock 数据受控     |
| GraphRAG 指标复杂度高      | 用户理解门槛高   | 提供节点/关系解释、运行态指标说明       |

## 9. 验收项

- Vite 构建通过，无 TypeScript 错误。
- 主站能够在 `/app/knowledge-hub` 加载微应用并完成 Tab 切换。
- API 页面显示完整的 Schema 与错误码信息。
- 配置中心读取到新微应用并可控制启停。
