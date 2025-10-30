# 知识中台后端 API 规格

本文档描述知识中台前端对后端的接口期望，覆盖知识空间管理、Pipeline 调度、GraphRAG 推理与质量治理能力。接口以 REST 形式定义，未来可扩展为 GraphQL。

## 1. 服务拆分

| 服务                   | Base Path             | 说明                                   |
| ---------------------- | --------------------- | -------------------------------------- |
| knowledge-core-service | `/api/knowledge-core` | 知识空间、Pipeline、检索指标、资产管理 |
| graph-reasoner-service | `/api/graph-reasoner` | GraphRAG 推理、图谱构建、质量治理      |

## 2. 统一约定

- 所有请求需携带 `Authorization: Bearer <token>`，Token 由主站统一颁发。
- 响应体统一格式：
  ```json
  {
    "code": "OK",
    "message": "success",
    "data": { ... }
  }
  ```
- 错误码约定：
  | code | httpStatus | message |
  | --- | --- | --- |
  | AUTH_401 | 401 | 身份认证失败 |
  | SPACE_NOT_FOUND | 404 | 知识空间不存在或未授权 |
  | RATE_LIMITED | 429 | 请求被限流，请稍后重试 |
  | INTERNAL_ERROR | 500 | 服务内部异常 |

## 3. knowledge-core-service

### 3.1 列出知识空间

- **Method**: `GET /spaces`
- **Query 参数**：
  | 参数 | 类型 | 是否必填 | 说明 |
  | --- | --- | --- | --- |
  | `modality` | string | 否 | 过滤模态：`text`/`multimodal`/`graph` |
  | `status` | string | 否 | 状态：`active`/`syncing`/`paused` |
  | `page` | number | 否 | 页码，从 1 开始 |
  | `pageSize` | number | 否 | 分页大小，默认 20，最大 100 |
- **响应**：
  ```json
  {
    "code": "OK",
    "message": "success",
    "data": {
      "items": [
        {
          "id": "space-marketing",
          "name": "营销投放知识库",
          "description": "覆盖投放策略、渠道投放指南及行业案例",
          "modality": "text",
          "documentCount": 38560,
          "tokens": 217000000,
          "lastSync": "2025-01-17T08:30:00Z",
          "owners": ["marketing@corp"],
          "status": "active",
          "searchLatencyMs": 640,
          "recall": 0.83
        }
      ],
      "total": 18
    }
  }
  ```

### 3.2 创建知识空间

- **Method**: `POST /spaces`
- **Request Body**：
  ```json
  {
    "name": "客服交互知识库",
    "description": "客服语音转写与文本知识",
    "modality": "multimodal",
    "owners": ["support@corp"],
    "defaultPipelines": ["pipeline-multimodal"]
  }
  ```
- **响应**：
  ```json
  {
    "code": "OK",
    "message": "success",
    "data": {
      "spaceId": "space-support"
    }
  }
  ```

### 3.3 查询 Pipeline 列表

- **Method**: `GET /pipelines`
- **Query**：`spaceId`（可选）、`modality`（可选）。
- **响应**：返回 Pipeline 列表，字段与前端 `IngestionPipeline` 类型一致。

### 3.4 触发 Pipeline 运行

- **Method**: `POST /pipelines/{pipelineId}/trigger`
- **Request Body**：
  ```json
  {
    "dryRun": false,
    "overrideConfig": {
      "chunk": { "maxTokens": 480 }
    }
  }
  ```
- **响应**：
  ```json
  {
    "code": "OK",
    "message": "success",
    "data": {
      "taskId": "task-20250117-0001",
      "status": "queued"
    }
  }
  ```

### 3.5 获取检索评估结果

- **Method**: `GET /evaluations`
- **Query**：`spaceId`、`metric`、`from`、`to`。
- **响应**：返回指标列表，字段对齐 `RetrievalEvaluator`。

### 3.6 多模态资产列表

- **Method**: `GET /assets`
- **Query**：`spaceId`、`type`、`status`、`tags`。
- **响应**：返回 `MultimodalAsset` 列表。

## 4. graph-reasoner-service

### 4.1 GraphRAG 推理

- **Method**: `POST /graphrag/query`
- **Request Body**：
  ```json
  {
    "spaceId": "space-compliance",
    "query": "近期关于跨境数据出境的合规要求有哪些变化？",
    "maxHops": 4,
    "reasoningMode": "chain-of-thought"
  }
  ```
- **响应**：
  ```json
  {
    "code": "OK",
    "message": "success",
    "data": {
      "answer": "...",
      "evidences": [{ "nodeId": "policy-2024-001", "source": "国家网信办", "confidence": 0.92 }],
      "reasoningTrace": {
        "steps": [{ "hop": 1, "action": "vector_search", "detail": "命中政策条款" }]
      }
    }
  }
  ```

### 4.2 GraphRAG 运行态列表

- **Method**: `GET /graphrag/runs`
- **Query**：`status`、`from`、`to`、`spaceId`。
- **响应**：返回 `GraphRagRun` 列表。

### 4.3 节点/关系模板

- **Method**: `GET /graph/schema`
- **响应**：
  ```json
  {
    "code": "OK",
    "message": "success",
    "data": {
      "nodeTypes": [
        {
          "id": "node-policy",
          "label": "政策条款",
          "description": "结构化法规条文节点，包含生效时间与引用来源",
          "example": "《数据安全法》第三十一条"
        }
      ],
      "relationshipTypes": [
        {
          "id": "rel-requirement",
          "label": "约束",
          "source": "政策条款",
          "target": "业务流程",
          "description": "法规对流程节点的强制约束关系"
        }
      ]
    }
  }
  ```

### 4.4 质量缺陷查询

- **Method**: `GET /quality/issues`
- **Query**：`severity`、`owner`、`from`、`to`。
- **响应**：返回 `DataQualityIssue` 列表。

## 5. 后续扩展接口

- Pipeline 历史运行记录：`GET /pipelines/{pipelineId}/runs`
- 资产详情：`GET /assets/{assetId}`
- 手册/SOP 管理：`POST /playbooks` `PUT /playbooks/{id}` `GET /playbooks`

## 6. 性能与监控指标

- 每个服务需暴露 Prometheus 指标，至少包含 QPS、P95 延迟、错误率、GraphRAG reasoning tokens 消耗。
- 对接 Grafana 面板，在运营页补充实时曲线（后续迭代）。

## 7. 部署建议

- 采用 Kubernetes 部署，按服务独立扩缩容。
- knowledge-core-service 建议开启读写分离，GraphRAG 推理服务需支持异步任务队列（用于长耗时推理）。
- 建议接入消息队列（Kafka/Redis Stream）同步入库事件，方便运营中心实时刷新。
