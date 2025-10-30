# Knowledge Hub 微应用

面向文本、多模态与 GraphRAG 场景的知识中台前端。提供跨模态知识资产概览、入库编排、GraphRAG 推理运行态监控、知识治理运营面板，以及后端 API Schema 参考。

## 开发

```bash
pnpm --filter knowledge-hub-app dev
```

## 构建

```bash
pnpm --filter knowledge-hub-app build
```

该微应用将以 `/knowledge-hub-app/` 作为生产环境资源路径，并在主应用路径 `/app/knowledge-hub` 下挂载。
