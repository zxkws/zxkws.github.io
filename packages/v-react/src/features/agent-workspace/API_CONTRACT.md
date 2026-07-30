# Agent Workspace API 契约

本文供后续 NestJS 实现者使用。当前唯一真源是同目录的
`domain.ts`、`data/client.ts` 和 `data/http-client.ts`；本文只解释这三个文件已经固定的
HTTP 契约，不替它们新增字段或路由。

## 1. 契约边界

- API 前缀固定为 `/v1/agent-workspace`。
- JSON 字段名、枚举值和日期字段必须原样返回。日期时间使用字符串，前端不代为转换。
- `EntityId`、游标、序号、SHA 等在客户端均按字符串处理；不要把数据库大整数转成
  JavaScript `number`。
- 除 SSE 和对象存储直传外，成功响应都必须使用统一成功 envelope。
- 当前是单 owner 私有产品，不存在 organization、tenant、member、role 等团队 DTO。
- 当前文件定义的是 owner Web 客户端契约。Runner 的领取任务、租约、心跳、事件上报、
  pairing 换证等 daemon 协议尚未定义，不能在本契约下自行发明路由。

## 2. 成功与错误响应

### 2.1 成功 envelope

所有成功 JSON 响应必须为：

```ts
type ApiEnvelope<T> = {
  code: number;
  data: T;
  message: string;
};
```

`code` 必须与实际 HTTP status 完全相等，否则前端会将响应判为无效。`data` 属性必须存在，
即使值为 `null`。`message` 必须是字符串。不要返回空 body；因此这些接口不能用 `204`。

典型读取响应：

```json
{
  "code": 200,
  "data": {
    "items": [],
    "pageInfo": {
      "nextCursor": null,
      "previousCursor": null,
      "hasNext": false,
      "hasPrevious": false
    }
  },
  "message": "ok"
}
```

### 2.2 错误对象

非 2xx 响应不使用成功 envelope。前端能完整识别的错误对象为：

```ts
type ApiProblem = {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
};
```

示例：

```json
{
  "code": "VERSION_CONFLICT",
  "message": "expectedVersion does not match current version",
  "details": {
    "expectedVersion": 7,
    "currentVersion": 8
  },
  "requestId": "req_01..."
}
```

约束：

- `code` 是稳定的机器可读字符串；错误响应中的 `code` 与成功 envelope 的数字 `code`
  不是同一种字段语义。
- `message` 应是可直接显示的原始错误字符串。
- `requestId` 也可放在 `x-request-id` 响应头；body 优先。
- 限流用 HTTP `429`，并用 `Retry-After` 响应头给出秒数。SSE 客户端会读取它。
- SSE 返回 `401` 或 `403` 后，客户端进入 `auth_failed` 且停止自动重连，直到重新成功获取
  bootstrap。
- SSE cursor 已超出事件保留范围时用 HTTP `410`。客户端会清空本地 cursor、发出
  `resync` signal，并要求重新获取 bootstrap。
- 其他非 2xx 状态均会被保留为 `AgentWorkspaceApiError.status`。建议按
  `400`（格式/校验）、`401`（未登录）、`403`（CSRF 或无权访问）、`404`（owner 范围内
  不存在）、`409`（版本、幂等键或状态冲突）、`410`（事件 cursor 已过期）、
  `413`（请求体过大）、`422`（语义不成立）、`429`（限流）和 `5xx`（服务端错误）区分，
  但具体错误码字符串尚未在 TypeScript 中枚举。
- 如果 body 不是对象，前端仍会显示字符串 body；这只应作为兜底，不是正式契约。

## 3. 身份、CSRF 与 owner scope

### 3.1 身份传递

所有请求都使用 `credentials: "include"`，因此 NestJS 必须支持凭据 cookie。

在允许发送 bearer 的来源上，前端还会读取 `localStorage.auth_token` 并发送：

```http
Authorization: Bearer <token>
```

服务端可在任意响应的 `Token` header 中下发新 token，前端会覆盖
`localStorage.auth_token`。跨源部署时如需此行为，CORS 必须显式暴露 `Token` header，
允许前端的精确 origin，并启用 credentials；不能使用通配 origin。

当页面和 API 分别位于 `zxkws.nyc.mn` 的不同子域时，前端有意不发送
`Authorization`，只依赖共享 cookie。相同 origin、非 HTTP 相对 API、以及不属于该项目域名
组合时，可以发送 bearer。

### 3.2 CSRF

所有非 `GET` API 命令都会按以下顺序读取 cookie：

1. `csrf_token`
2. `XSRF-TOKEN`

存在时发送：

```http
X-CSRF-Token: <cookie value>
```

后端应对 cookie 身份认证的所有 mutation 校验该 header。SSE 和普通 `GET` 不发送 CSRF
header。Bearer-only 请求是否免 CSRF由后端统一决定，但不能因此放松 cookie 会话的校验。

### 3.3 单 owner 隔离

- owner 身份只能从已验证的 session/token 得出，不能接受 body、query 或 path 中的
  `ownerId`。
- 每次按 ID 查询、更新或签发下载链接，都必须同时带 owner scope；不在该 owner 范围内的
  资源按不存在处理。
- project 子资源还必须验证 `projectId` 归属及交叉引用一致性。例如 conversation、
  repository、agent、attachment、task 必须与命令中的 project 相同。
- `Agent.policy` 的 `project_owner | host_owner` 是 agent 执行权限快照，不是登录用户角色。
- `Computer.registeredRoots.path`、`Repository.path`、`worktreePath`、install command 和
  对象存储 URL 都是 owner 私密数据。

## 4. 命令、幂等和乐观并发

### 4.1 每个 mutation 的固定协议

所有 mutation body 至少包含：

```ts
type MutationInput = {
  clientMutationId: string;
};
```

前端同时发送：

```http
Idempotency-Key: <clientMutationId>
Content-Type: application/json
Accept: application/json
```

服务端必须验证 header 与 body 中的值相同。幂等记录至少按已认证 owner 和 key 隔离，并保存
原始命令指纹及完整成功 receipt：

- 同 owner、同 key、同命令重放：不得再次产生副作用，返回第一次 receipt，
  `replayed: true`。
- 同 owner、同 key、不同 method/path/body：返回冲突，不可执行。
- 初次执行：`replayed: false`。
- 网络超时不能成为重复创建 task、run、delivery 或 message 的理由。

成功命令的 `data` 必须是：

```ts
type CommandReceipt<TResource> = {
  commandId: string;
  clientMutationId: string;
  resource: TResource;
  eventCursor: string;
  replayed: boolean;
};
```

`eventCursor` 是该命令已持久化副作用之后可用于恢复事件流的 durable cursor。命令返回前，
业务写入、outbox/event 写入和幂等 receipt 应在同一事务中变得可见。

大多数命令的 `resource` 为：

```ts
type ResourceRef = {
  entityType: string;
  entityId: string;
  version: number | null;
};
```

例外：

- 发送消息：`SendMessageResult`
- 创建 Computer pairing：`ComputerPairing`
- 创建附件上传意图：`AttachmentUploadGrant`
- 全部 inbox 标为已读：`ResourceRef | null`

### 4.2 `expectedVersion`

更新既有 versioned resource 的命令使用：

```ts
type VersionedMutationInput = {
  clientMutationId: string;
  expectedVersion: number;
};
```

服务端必须在数据库写条件中比较当前 version，而不是先读后无条件写。成功后 version 递增，
receipt 中返回新 version；不匹配时不产生任何部分副作用，并返回冲突错误。`DELETE` 命令同样
携带 JSON body 和 `expectedVersion`，代理层不得丢弃 DELETE body。

创建命令、发送消息、创建 message task、启动 run、回复输入、mark-all-read 和创建 pairing
没有 `expectedVersion`，但仍必须幂等。

## 5. 分页和读取接口

### 5.1 `CursorPage`

```ts
type CursorPage<T> = {
  items: T[];
  pageInfo: {
    nextCursor: string | null;
    previousCursor: string | null;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};
```

四个 `pageInfo` 字段必须始终存在。游标是 opaque string，前后端不得解析或转成数字。

通用 query 类型为：

```ts
type CursorQuery = {
  cursor?: string;
  before?: string;
  after?: string;
  limit?: number;
};
```

实际 HTTP client 对参数的支持以表格为准：

| Method | Path                                                                             | Query                       | `data`                               |
| ------ | -------------------------------------------------------------------------------- | --------------------------- | ------------------------------------ |
| GET    | `/v1/agent-workspace/bootstrap`                                                  | 无                          | `WorkspaceBootstrap`                 |
| GET    | `/v1/agent-workspace/inbox`                                                      | `cursor,before,after,limit` | `CursorPage<InboxItem>`              |
| GET    | `/v1/agent-workspace/activity`                                                   | `cursor,before,after,limit` | `CursorPage<ActivityEvent>`          |
| GET    | `/v1/agent-workspace/projects/:projectId`                                        | 无                          | `ProjectOverview`                    |
| GET    | `/v1/agent-workspace/projects/:projectId/conversations/:conversationId/messages` | `cursor,before,after,limit` | `CursorPage<Message>`                |
| GET    | `/v1/agent-workspace/projects/:projectId/tasks`                                  | `cursor,limit,status`       | `CursorPage<Task>`                   |
| GET    | `/v1/agent-workspace/tasks/:taskId`                                              | 无                          | `TaskDetail`                         |
| GET    | `/v1/agent-workspace/projects/:projectId/runs`                                   | `cursor,limit,status`       | `CursorPage<Run>`                    |
| GET    | `/v1/agent-workspace/runs/:runId`                                                | 无                          | `RunDetail`                          |
| GET    | `/v1/agent-workspace/runs/:runId/events`                                         | `cursor,before,after,limit` | `CursorPage<RunEvent>`               |
| GET    | `/v1/agent-workspace/projects/:projectId/change-sets`                            | `cursor,limit,status`       | `CursorPage<ChangeSet>`              |
| GET    | `/v1/agent-workspace/change-sets/:changeSetId`                                   | 无                          | `ChangeSetDetail`                    |
| GET    | `/v1/agent-workspace/deliveries/:deliveryId`                                     | 无                          | `Delivery`                           |
| GET    | `/v1/agent-workspace/projects/:projectId/memories`                               | `cursor,before,after,limit` | `CursorPage<MemoryEntry>`            |
| GET    | `/v1/agent-workspace/projects/:projectId/automations`                            | `cursor,before,after,limit` | `CursorPage<Automation>`             |
| GET    | `/v1/agent-workspace/events`                                                     | `after,limit`               | `CursorPage<WorkspaceEventEnvelope>` |
| GET    | `/v1/agent-workspace/attachments/:id`                                            | 无                          | `Attachment`                         |
| GET    | `/v1/agent-workspace/attachments/:id/download`                                   | 无                          | `PrivateDownloadGrant`               |
| GET    | `/v1/agent-workspace/artifacts/:id`                                              | 无                          | `Artifact`                           |
| GET    | `/v1/agent-workspace/artifacts/:id/download`                                     | 无                          | `PrivateDownloadGrant`               |
| GET    | `/v1/agent-workspace/search`                                                     | `q,cursor,limit`            | `CursorPage<SearchResult>`           |

`ProjectListQuery` 在 TypeScript 中继承 `CursorQuery`，但当前 HTTP client 对 tasks、runs、
change-sets 只发送 `cursor`、`limit`、`status`；后端不能要求这些路径上的 `before` 或
`after`。同理 search 当前只发送 `q`、`cursor`、`limit`。

排序必须稳定，并给并列项增加唯一 ID tie-breaker，保证重复翻页不会漏项或重项。`limit`
默认值和最大值当前未在前端固定，应由后端设定并保持稳定。

### 5.2 Bootstrap

`WorkspaceBootstrap` 必须完整包含：

```ts
type WorkspaceBootstrap = {
  generatedAt: string;
  eventCursor: string;
  inbox: InboxItem[];
  activities: ActivityEvent[];
  projects: Project[];
  repositories: Repository[];
  agents: Agent[];
  computers: Computer[];
  conversations: Conversation[];
  settings: WorkspaceSettings;
};
```

bootstrap 不是 `WorkspaceSnapshot`，不能额外假设它包含 messages、tasks、runs、
changeSets、deliveries、memories 或 automations。

`eventCursor` 与上述数组必须形成一致读取点。正确流程是：

1. 在一致性边界读取 bootstrap 数据及该时刻 cursor。
2. 客户端成功解析 bootstrap 后，以 `after=eventCursor` 建立 SSE。
3. 建流期间发生的事件由 durable event log 补齐，不能只从内存广播“当前在线事件”。

### 5.3 Detail DTO

```ts
type ProjectOverview = {
  project: Project;
  repositories: Repository[];
  agents: Agent[];
  conversations: Conversation[];
  taskCounts: Record<string, number>;
  runCounts: Record<string, number>;
  changeSetCounts: Record<string, number>;
};

type TaskDetail = {
  task: Task;
  triggerMessage: Message | null;
  threadMessages: CursorPage<Message>;
  relatedTasks: Task[];
  runs: Run[];
};

type RunDetail = {
  run: Run;
  inputRequests: RunInputRequest[];
  contextSnapshot: ContextSnapshot;
  events: CursorPage<RunEvent>;
  changeSet: ChangeSet | null;
  delivery: Delivery | null;
};

type ChangeSetDetail = {
  changeSet: ChangeSet;
  delivery: Delivery | null;
};
```

`TaskDetail.threadMessages` 和 `RunDetail.events` 即使为空也必须返回完整 `CursorPage`。
`RunDetail.contextSnapshot` 非 nullable；创建 run 时必须先持久化对应快照。
Delivery 没有额外 wrapper DTO，`GET /deliveries/:deliveryId` 的 `data` 直接是完整
`Delivery`。

`ActivityEvent` 与 durable `WorkspaceEventEnvelope` 是两个不同 DTO：

```ts
type ActivityEvent = {
  id: string;
  projectId: string | null;
  actorType: 'owner' | 'agent' | 'system';
  actorId: string | null;
  type: string;
  entityType: string;
  entityId: string;
  message: string | null;
  createdAt: string;
};

type WorkspaceEventEnvelope = {
  cursor: string;
  id: string;
  type: string;
  projectId: string | null;
  entityType: string;
  entityId: string;
  occurredAt: string;
  data: Record<string, unknown> | null;
};
```

bootstrap 和 `/activity` 使用前者；`/events` 与 SSE 使用后者。

## 6. SSE 与 durable event cursor

### 6.1 建连

```http
GET /v1/agent-workspace/events/stream?after=<eventCursor>
Accept: text/event-stream
Last-Event-ID: <eventCursor>
Cookie: ...
```

首次 bootstrap 前客户端不会建流。已有 cursor 时，query `after` 和 `Last-Event-ID` 会同时
发送且值相同。服务端应接受任一恢复来源；二者同时存在时必须保证语义一致。

SSE 响应不是 JSON envelope。业务事件 frame：

```text
id: evt_cursor_00042
event: message
data: {"cursor":"evt_cursor_00042","id":"evt_00042","type":"run.updated","projectId":"prj_1","entityType":"run","entityId":"run_1","occurredAt":"2026-07-29T10:00:00.000Z","data":{"status":"running"}}

```

约束：

- `id:` 必须与 `data.cursor` 完全相等；不等时前端主动断流。
- `data` 必须是一个完整 `WorkspaceEventEnvelope`。
- cursor 必须 durable、全 owner 工作区有稳定顺序且可恢复；不能使用进程内数组或
  serverless 实例本地自增值。
- `after=x` 表示只返回 x 之后的事件，不重复 x。事件至少需要支持幂等消费；业务 event
  `id` 应稳定。
- 发送前必须先持久化事件；断线后 `/events?after=x` 与 SSE 必须能从同一事件源补齐。
- 响应应使用 `Content-Type: text/event-stream` 并禁止中间缓存、压缩缓冲和代理聚合。

### 6.2 Heartbeat

客户端忽略两类 heartbeat：

```text
: heartbeat

```

或任意 `event: heartbeat` frame。heartbeat 不能推进业务 cursor。当前 TypeScript 没有规定
固定心跳间隔；服务端应选择短于 Vercel/代理空闲超时的间隔，并允许函数正常结束后由客户端
重连。

服务端可发送标准 SSE `retry:` 毫秒值。客户端会将其上限裁为 30 秒。没有 server retry
时，客户端按约 1、2、4、8、16、30 秒指数退避，并加 0.8–1.2 随机抖动；最短 250ms。
浏览器离线时状态为 `offline`。

### 6.3 重连和恢复

- 正常 EOF、网络失败或 Vercel 函数时长结束都视为可重连，不需要让单次 SSE 永久常驻。
- 收到事件后，客户端将 cursor 更新为 frame id（没有 id 时用 `data.cursor`）。
- mutation receipt 的 `eventCursor` 也会推进本地 cursor。因此服务端必须保证该 cursor
  已覆盖此命令产生的事件。
- `401/403` 阻断重连；重新 bootstrap 成功后解除。
- `429` 的 `Retry-After` 按秒读取，上限 30 秒。
- 如事件保留策略使 cursor 失效，服务端返回 HTTP `410` 和标准错误对象。客户端会令
  `bootstrapReady = false`、清空 cursor，并通知
  `{ source: "resync", reason: error.code }`；上层随后必须重新请求 bootstrap，而不是继续
  从空 cursor 盲目建流。

## 7. Mutation 接口全集

下表列出 `data/http-client.ts` 中的全部 mutation。所有 body 均包含
`clientMutationId`，所有响应均为 `ApiEnvelope<CommandReceipt<...>>`。

| Method | Path                                                                             | Body                                                                  | Receipt `resource`      |
| ------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------- |
| POST   | `/v1/agent-workspace/projects`                                                   | `CreateProjectInput`                                                  | `ResourceRef`           |
| PATCH  | `/v1/agent-workspace/projects/:id`                                               | `UpdateProjectInput`                                                  | `ResourceRef`           |
| POST   | `/v1/agent-workspace/projects/:id/archive`                                       | `VersionedMutationInput`                                              | `ResourceRef`           |
| POST   | `/v1/agent-workspace/projects/:projectId/repositories`                           | `CreateRepositoryInput`                                               | `ResourceRef`           |
| PATCH  | `/v1/agent-workspace/repositories/:id`                                           | `UpdateRepositoryInput`                                               | `ResourceRef`           |
| DELETE | `/v1/agent-workspace/repositories/:id`                                           | `VersionedMutationInput`                                              | `ResourceRef`           |
| POST   | `/v1/agent-workspace/repositories/:id/refresh`                                   | `VersionedMutationInput`                                              | `ResourceRef`           |
| POST   | `/v1/agent-workspace/projects/:projectId/agents`                                 | `CreateAgentInput`                                                    | `ResourceRef`           |
| PATCH  | `/v1/agent-workspace/agents/:id`                                                 | `UpdateAgentInput`                                                    | `ResourceRef`           |
| POST   | `/v1/agent-workspace/agents/:id/enabled`                                         | `VersionedMutationInput & { enabled: boolean }`                       | `ResourceRef`           |
| POST   | `/v1/agent-workspace/agents/:id/restart`                                         | `VersionedMutationInput`                                              | `ResourceRef`           |
| POST   | `/v1/agent-workspace/agents/:id/session/reset`                                   | `VersionedMutationInput`                                              | `ResourceRef`           |
| POST   | `/v1/agent-workspace/agents/:id/reset`                                           | `VersionedMutationInput`                                              | `ResourceRef`           |
| POST   | `/v1/agent-workspace/inbox/:id/read`                                             | `VersionedMutationInput`                                              | `ResourceRef`           |
| POST   | `/v1/agent-workspace/inbox/read-all`                                             | `MutationInput`                                                       | `ResourceRef \| null`   |
| POST   | `/v1/agent-workspace/projects/:projectId/conversations/:conversationId/messages` | `SendMessageInput`                                                    | `SendMessageResult`     |
| POST   | `/v1/agent-workspace/messages/:messageId/task`                                   | `MutationInput & { agentId: string \| null }`                         | `ResourceRef`           |
| PATCH  | `/v1/agent-workspace/tasks/:taskId`                                              | `UpdateTaskInput`                                                     | `ResourceRef`           |
| POST   | `/v1/agent-workspace/runs`                                                       | `StartRunInput`                                                       | `ResourceRef`           |
| POST   | `/v1/agent-workspace/runs/:runId/cancel`                                         | `VersionedMutationInput`                                              | `ResourceRef`           |
| POST   | `/v1/agent-workspace/runs/:runId/retry`                                          | `VersionedMutationInput`                                              | `ResourceRef`           |
| POST   | `/v1/agent-workspace/runs/:runId/input-requests/:inputRequestId/reply`           | `ReplyToRunInput`                                                     | `ResourceRef`           |
| POST   | `/v1/agent-workspace/change-sets/:id/approve`                                    | `VersionedMutationInput`                                              | `ResourceRef`           |
| POST   | `/v1/agent-workspace/change-sets/:id/reject`                                     | `VersionedMutationInput & { reason: string \| null }`                 | `ResourceRef`           |
| POST   | `/v1/agent-workspace/change-sets/:changeSetId/deliveries`                        | `CreateDeliveryInput`                                                 | `ResourceRef`           |
| POST   | `/v1/agent-workspace/deliveries/:id/retry`                                       | `VersionedMutationInput & { targetIds: string[] }`                    | `ResourceRef`           |
| POST   | `/v1/agent-workspace/deliveries/:id/reconcile`                                   | `VersionedMutationInput`                                              | `ResourceRef`           |
| POST   | `/v1/agent-workspace/projects/:projectId/automations`                            | `CreateAutomationInput`                                               | `ResourceRef`           |
| PATCH  | `/v1/agent-workspace/automations/:id`                                            | `UpdateAutomationInput`                                               | `ResourceRef`           |
| DELETE | `/v1/agent-workspace/automations/:id`                                            | `VersionedMutationInput`                                              | `ResourceRef`           |
| POST   | `/v1/agent-workspace/automations/:id/enabled`                                    | `VersionedMutationInput & { enabled: boolean }`                       | `ResourceRef`           |
| POST   | `/v1/agent-workspace/automations/:id/run`                                        | `VersionedMutationInput`                                              | `ResourceRef`           |
| POST   | `/v1/agent-workspace/memories`                                                   | `CreateMemoryInput`                                                   | `ResourceRef`           |
| POST   | `/v1/agent-workspace/memories/:id/pinned`                                        | `VersionedMutationInput & { pinned: boolean }`                        | `ResourceRef`           |
| DELETE | `/v1/agent-workspace/memories/:id`                                               | `VersionedMutationInput`                                              | `ResourceRef`           |
| POST   | `/v1/agent-workspace/computers/:id/drain`                                        | `VersionedMutationInput & { draining: boolean }`                      | `ResourceRef`           |
| POST   | `/v1/agent-workspace/computers/pairings`                                         | `MutationInput`                                                       | `ComputerPairing`       |
| POST   | `/v1/agent-workspace/computers/:id/revoke`                                       | `VersionedMutationInput`                                              | `ResourceRef`           |
| POST   | `/v1/agent-workspace/attachments/upload-intents`                                 | `CreateAttachmentUploadInput`                                         | `AttachmentUploadGrant` |
| POST   | `/v1/agent-workspace/attachments/:id/complete`                                   | `CompleteAttachmentUploadInput`                                       | `ResourceRef`           |
| DELETE | `/v1/agent-workspace/attachments/:id`                                            | `VersionedMutationInput`                                              | `ResourceRef`           |
| PATCH  | `/v1/agent-workspace/settings`                                                   | `Partial<WorkspaceSettings without version> & VersionedMutationInput` | `ResourceRef`           |

Path 中的 project/conversation/message/run/inputRequest/changeSet ID 必须与 body 中重复出现的 ID
一致；不一致应整体拒绝。例如创建 repository 的 path `:projectId` 必须等于
`body.projectId`。

## 8. Mutation DTO

以下字段均来自 `domain.ts`。没有标 `?` 的字段不可省略，nullable 字段必须显式允许
`null`。

### 8.1 Project、Repository、Agent

```ts
type CreateProjectInput = MutationInput & {
  name: string;
  description: string | null;
};

type UpdateProjectInput = VersionedMutationInput & {
  name?: string;
  description?: string | null;
  defaultAgentId?: string | null;
};

type CreateRepositoryInput = MutationInput & {
  projectId: string;
  name: string;
  url: string;
  registeredRootId: string;
  rootAlias: string;
  relativePath: string;
  defaultBranch: string;
  computerId: string;
};

type UpdateRepositoryInput = VersionedMutationInput & {
  name?: string;
  url?: string;
  registeredRootId?: string;
  rootAlias?: string;
  relativePath?: string;
  defaultBranch?: string;
  computerId?: string;
};

type CreateAgentInput = MutationInput & {
  projectId: string;
  name: string;
  handle: string;
  description: string;
  runtime: 'codex' | 'claude-code';
  model: string;
  computerId: string | null;
  policy: 'project_owner' | 'host_owner';
  budget: Record<string, string | number | null>;
  repositoryIds: string[];
  skills: string[];
  mcpServers: string[];
};
```

`UpdateAgentInput` 是上述 agent 可配置字段的 partial，另加必填
`clientMutationId`、`expectedVersion`；不可通过它直接写 status、sessionId、
configurationVersion、inboxCount 或 currentRunId。

### 8.2 Message、Task、Run、Delivery

```ts
type SendMessageInput = {
  projectId: string;
  conversationId: string;
  content: string;
  agentId: string | null;
  asTask: boolean;
  attachmentIds: string[];
  clientMutationId: string;
};

type SendMessageResult = {
  messageId: string;
  taskId: string | null;
};

type UpdateTaskInput = VersionedMutationInput & {
  title?: string;
  description?: string | null;
  acceptanceCriteria?: string[];
  status?: 'todo' | 'in_progress' | 'blocked' | 'in_review' | 'done' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedAgentId?: string | null;
  dependencyIds?: string[];
  blockingReason?: string | null;
};

type StartRunInput = {
  projectId: string;
  taskId: string | null;
  agentId: string;
  triggerMessageId: string | null;
  clientMutationId: string;
};

type ReplyToRunInput = {
  runId: string;
  inputRequestId: string;
  content: string;
  attachmentIds: string[];
  clientMutationId: string;
};

type DeliveryTargetInput = {
  repositoryId: string;
  kind: 'commit' | 'push' | 'pull_request' | 'deploy';
  branch: string | null;
  title: string | null;
  description: string | null;
  options: Record<string, unknown>;
};

type CreateDeliveryInput = VersionedMutationInput & {
  changeSetId: string;
  targets: DeliveryTargetInput[];
};
```

`CreateDeliveryInput.expectedVersion` 对应 path/body 指定的 ChangeSet 当前 version。delivery
重试的 `expectedVersion` 对应 Delivery version。

### 8.3 Automation、Memory、Settings

```ts
type AutomationTrigger =
  | { type: 'schedule'; cron: string; timezone: string }
  | { type: 'webhook'; path: string }
  | {
      type: 'github_event';
      repositoryId: string;
      event: string;
      filters: Record<string, unknown>;
    };

type CreateAutomationInput = MutationInput & {
  projectId: string;
  name: string;
  trigger: AutomationTrigger;
  instruction: string;
  repositoryIds: string[];
  agentId: string;
  taskPolicy: 'create_task' | 'message_only';
  deliveryPolicy: 'change_set_only' | 'deliver';
  missedRunPolicy: 'skip' | 'run_once' | 'backfill';
  enabled: boolean;
};
```

`UpdateAutomationInput` 是 create 中除 `projectId`、`clientMutationId` 外各业务字段的
partial，另加必填 `clientMutationId`、`expectedVersion`。

Memory 使用 discriminated union：

```ts
type CreateMemoryInput = MutationInput & {
  projectId: string;
  content: string;
} & ({ scope: 'project'; agentId: null } | { scope: 'agent'; agentId: string });
```

Settings patch 的可选业务字段为：

```ts
{
  ownerMode?: "project_owner" | "host_owner";
  defaultProjectId?: string | null;
  maxConcurrentRuns?: number;
  maxAgentHandoffDepth?: number;
  notificationMuted?: boolean;
  quietHours?: {
    timezone: string;
    start: string;
    end: string;
  } | null;
  clientMutationId: string;
  expectedVersion: number;
}
```

### 8.4 Attachment

```ts
type CreateAttachmentUploadInput = MutationInput & {
  projectId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
};

type AttachmentUploadGrant = {
  attachmentId: string;
  attachmentVersion: number;
  uploadUrl: string;
  method: 'PUT' | 'POST';
  headers: Record<string, string>;
  expiresAt: string;
  maxBytes: number;
};

type CompleteAttachmentUploadInput = VersionedMutationInput & {
  sizeBytes: number;
  sha256: string;
};
```

complete 时的 `expectedVersion` 使用 grant 返回的 `attachmentVersion`。

## 9. 状态机和数据不变量

当前 TypeScript 固定了允许出现的状态集合，但没有编码完整的“状态 A 可以迁移到状态 B”
邻接表。因此后端必须遵守下面的强不变量，同时不要把本文没有定义的迁移图伪装成前端契约。

### 9.1 枚举集合

- Project：`active | archived`
- Agent：`idle | busy | offline | error | disabled`
- Agent session：`active | idle | reset_required | unavailable`
- Computer：`online | offline | draining | error | revoked`
- Task：`todo | in_progress | blocked | in_review | done | cancelled`
- Run：`queued | running | waiting_input | cancel_requested | succeeded | failed | cancelled | interrupted`
- RunInputRequest：`open | answered | cancelled`
- ChangeSet：`draft | ready | approved | rejected | delivering | delivered | delivery_failed`
- Delivery 和 DeliveryTarget：
  `pending | running | succeeded | failed | partial | outcome_unknown | cancelled`
- Attachment：`pending | available | failed`
- Message：`sent | held`

### 9.2 强不变量

- 客户端没有任意写 Agent、Computer、Run、RunInputRequest、ChangeSet、Delivery 或
  Attachment status 的接口；这些状态必须由明确命令及后端/Runner 事件推进。
- 所有 versioned mutation 先检查 `expectedVersion`，一次成功迁移只递增一次 version。
- retry run 是可审计的新 attempt：`retryOfRunId`、`rootRunId`、`attempt` 字段必须保持同一
  retry 链，不能抹掉旧 run 的终态。receipt 指向后端实际创建或变更的资源。
- `Run.status = waiting_input` 时，`activeInputRequestId` 应指向该 run 的 open request；
  reply path/body 必须同时指向该 request。一次幂等 reply 只能产生一个
  `responseMessageId`。
- `Run.contextSnapshotId` 必须指向 `RunDetail.contextSnapshot.id`，且 snapshot 的
  `runId/projectId/runtime/model/triggerMessageId` 与 run 一致；Automation 或 Task 可在没有
  trigger message 时启动，此时两处 `triggerMessageId` 都是 `null`。执行中不得改写既有
  snapshot。
- `Run.changeSetId`、`ChangeSet.runId`、`Delivery.changeSetId`、task/project 交叉引用必须
  闭合一致。不能把另一个 project 的 repository 作为 delivery target。
- ChangeSet approve/reject/deliver、Delivery retry/reconcile 和 Run cancel/retry 必须在
  后端做状态前置条件检查；失败时整个命令无副作用并返回冲突。当前前端未固定具体允许迁移
  邻接表。
- `Delivery.targets` 的聚合 status 必须由 target 结果一致计算；`partial` 与
  `outcome_unknown` 不得被伪装成 `succeeded`。
- `MemoryEntry.scope = project` 时 `agentId` 必须为 `null`；scope 为 `agent` 时必须是同
  project 的有效 agent。
- `Automation.trigger` 必须严格按 `type` 校验对应字段；不要把不同 trigger 的字段混合。
- Repository 的 `registeredRootId/rootAlias/relativePath/computerId` 必须落在目标
  Computer 已注册 root 内。服务端不得相信客户端提交的绝对 `path`；创建/更新 DTO 也没有
  `path` 字段。
- attachment 初始为 `pending`；complete 前需验证对象存在、实际 size/hash 与 intent 和
  complete body 一致，再原子进入 `available`。失败不能返回 available。
- archive/revoke/delete 等操作仍需保留事件及幂等 receipt，避免重放时找不到第一次结果。

## 10. Computer pairing

Owner Web 客户端当前只有创建 pairing：

```http
POST /v1/agent-workspace/computers/pairings
Idempotency-Key: pair-01
Content-Type: application/json

{"clientMutationId":"pair-01"}
```

receipt 的 `resource`：

```ts
type ComputerPairing = {
  id: string;
  code: string;
  expiresAt: string;
  status: 'pending';
  installCommand: string;
};
```

安全要求：

- code 必须高熵、一次性、短时有效，服务端只存不可逆摘要。
- install command 中不能嵌入 owner 的长期 Web bearer、数据库凭据或永久 Runner secret。
- 同一个幂等命令重放必须返回同一个 pairing receipt，而不是生成多个有效 code。
- pairing、最终 Computer 和后续凭据都必须绑定当前 owner；revoke 后旧凭据不可继续使用。
- `POST /computers/:id/revoke` 需 `expectedVersion`；drain 命令 body 为
  `{ clientMutationId, expectedVersion, draining }`。

重要边界：当前三个真源文件没有定义 Runner 使用 code 领取 pairing、交换设备凭据、上报
心跳、更新 capabilities 或领取 lease 的 endpoint/DTO。真实 Runner 上线前必须单独冻结
daemon contract；不能让 NestJS 实现者凭本文猜测这些路由。

## 11. 对象存储直传与 4.5 MB 边界

附件必须走三段式：

1. Web 向 `/attachments/upload-intents` 发送小型 JSON 元数据。
2. Web 使用 receipt 中的 `uploadUrl`、`method` 和 `headers` 将文件直接传给私有对象
   存储。
3. Web 向 `/attachments/:id/complete` 发送小型 JSON，使用 grant 的
   `attachmentVersion` 作为 `expectedVersion`。

直传 URL 不属于 NestJS API，响应也不使用 API envelope。上传时只使用 grant 指定的
headers；不要把 Web session cookie、CSRF 或 bearer 主动转发给第三方对象存储 origin。
当前 grant 只有 `headers`，没有 multipart form fields，因此对象存储授权必须支持以文件
body 配合这些 header 完成 `PUT` 或 `POST`。

本项目部署在 Vercel，4.5 MB 是本契约要求规避的函数请求体边界，不是
`domain.ts` 中的业务上限常量：

- 文件二进制、base64、完整 diff、stdout/stderr、artifact 均不得经过 NestJS/Vercel
  函数 body，即使当前文件小于 4.5 MB。
- intent 和 complete 只能携带元数据，保持远小于 4.5 MB。
- 真正业务上限由 `AttachmentUploadGrant.maxBytes` 给出；后端必须同时在 intent、
  对象存储上传条件和 complete 三处执行。
- `sizeBytes` 与 `sha256` 在 intent、实际对象和 complete 间必须一致。
- 过大 intent 应在签发 URL 前拒绝；对象不一致时 complete 失败，不能仅信客户端 body。

私有下载：

```ts
type PrivateDownloadGrant = {
  url: string;
  expiresAt: string;
};
```

`GET /attachments/:id/download` 和 `GET /artifacts/:id/download` 只能在 owner scope 校验后
签发短期 URL。附件元数据和 artifact 元数据本身仍通过相应 detail endpoint 获取。

## 12. Redaction 与原始值

“后端返回什么就展示什么”表示前端不会擅自格式化状态、时间、usage、错误和模型返回值，
不表示秘密可以原样落库或下发。

可显示文本 artifact 引用为：

```ts
type TextArtifactRef = {
  id: string;
  kind: 'diff' | 'stdout' | 'stderr' | 'attachment' | 'run_artifact';
  mediaType: string;
  byteSize: number;
  sha256: string;
  preview: string | null;
  truncated: boolean;
  redactionStatus: 'not_required' | 'redacted' | 'failed';
};
```

实现要求：

- 在持久化和发布 SSE 前，对命令 stdout/stderr、diff preview、RunEvent.message/data、
  ActivityEvent.message、错误详情及搜索 snippet 做秘密检测。
- `redacted` 表示返回内容已经替换敏感片段；不要再由前端二次“美化”。
- redaction 失败必须 fail closed：`preview` 设为 `null`、`truncated` 保持真实语义，并且
  不签发会泄密的下载 URL。`failed` 不能被当成“可原样展示”。
- `not_required` 只能用于已判定无需处理的内容，不是“没有运行扫描”。
- `byteSize` 和 `sha256` 应描述实际可下载的存储对象；如扫描后生成了脱敏副本，两者不能
  仍引用未脱敏原件的元数据。
- `WorkspaceEventEnvelope.data` 是开放结构，但不能包含 bearer、cookie、CSRF、pairing
  code、对象存储签名 URL、环境变量秘密或未经脱敏的完整进程环境。
- `installCommand` 和 pairing code 只在创建 pairing 的 owner 响应中出现，不进入 activity、
  search、普通日志或 SSE data。

## 13. 典型端到端 DTO 示例

### 13.1 更新 task

请求：

```http
PATCH /v1/agent-workspace/tasks/task_1
Idempotency-Key: cmid_task_1_review
X-CSRF-Token: csrf-value
Content-Type: application/json

{"clientMutationId":"cmid_task_1_review","expectedVersion":4,"status":"in_review"}
```

响应：

```json
{
  "code": 200,
  "data": {
    "commandId": "cmd_101",
    "clientMutationId": "cmid_task_1_review",
    "resource": {
      "entityType": "task",
      "entityId": "task_1",
      "version": 5
    },
    "eventCursor": "evt_cursor_101",
    "replayed": false
  },
  "message": "ok"
}
```

同一请求超时后重放：

```json
{
  "code": 200,
  "data": {
    "commandId": "cmd_101",
    "clientMutationId": "cmid_task_1_review",
    "resource": {
      "entityType": "task",
      "entityId": "task_1",
      "version": 5
    },
    "eventCursor": "evt_cursor_101",
    "replayed": true
  },
  "message": "ok"
}
```

### 13.2 发送消息并创建 task

```http
POST /v1/agent-workspace/projects/prj_1/conversations/conv_1/messages
Idempotency-Key: cmid_message_1
Content-Type: application/json

{"projectId":"prj_1","conversationId":"conv_1","content":"修复构建失败","agentId":"agent_1","asTask":true,"attachmentIds":[],"clientMutationId":"cmid_message_1"}
```

```json
{
  "code": 201,
  "data": {
    "commandId": "cmd_102",
    "clientMutationId": "cmid_message_1",
    "resource": {
      "messageId": "msg_1",
      "taskId": "task_2"
    },
    "eventCursor": "evt_cursor_103",
    "replayed": false
  },
  "message": "created"
}
```

### 13.3 创建直传意图

```http
POST /v1/agent-workspace/attachments/upload-intents
Idempotency-Key: cmid_upload_1
Content-Type: application/json

{"projectId":"prj_1","fileName":"build.log","contentType":"text/plain","sizeBytes":1234,"sha256":"4f...","clientMutationId":"cmid_upload_1"}
```

```json
{
  "code": 201,
  "data": {
    "commandId": "cmd_104",
    "clientMutationId": "cmid_upload_1",
    "resource": {
      "attachmentId": "att_1",
      "attachmentVersion": 1,
      "uploadUrl": "https://object-storage.example/signed-upload",
      "method": "PUT",
      "headers": {
        "Content-Type": "text/plain"
      },
      "expiresAt": "2026-07-29T10:10:00.000Z",
      "maxBytes": 10485760
    },
    "eventCursor": "evt_cursor_104",
    "replayed": false
  },
  "message": "created"
}
```

对象存储成功后：

```http
POST /v1/agent-workspace/attachments/att_1/complete
Idempotency-Key: cmid_upload_1_complete
Content-Type: application/json

{"clientMutationId":"cmid_upload_1_complete","expectedVersion":1,"sizeBytes":1234,"sha256":"4f..."}
```

示例中的 ID、cursor、hash、URL、时间和 `maxBytes` 仅展示 DTO shape，不是固定值。

## 14. 后端实现验收清单

- 成功 envelope 的数字 `code` 与 HTTP status 相等，所有成功请求都有 JSON body。
- error body 使用字符串 `code`，保留 request ID，429 返回 `Retry-After`。
- owner scope、project 交叉引用、CSRF 和 CORS credentials 均有统一 guard。
- 所有 mutation 校验 `Idempotency-Key === clientMutationId`，receipt 可 durable replay。
- 所有 versioned mutation 原子比较 `expectedVersion`。
- bootstrap 与 `eventCursor` 一致；event log durable；SSE 断开可从 cursor 无缝补齐。
- 列表返回完整 `CursorPage`，参数支持与第 5 节完全一致。
- 42 个 mutation 路径、method、body 和 receipt 类型与第 7 节一致。
- 文件始终对象存储直传，NestJS 不代理二进制，不触碰 4.5 MB 函数 body 边界。
- attachment complete 核验对象 size/hash，并使用 grant 的 `attachmentVersion`。
- 下载 URL 私有、短时、owner-scoped。
- secret 在落库/SSE/preview/search 之前 redaction；redaction 失败 fail closed。
- 不新增 ownerId、团队字段、Runner endpoint 或未在真源出现的 Web API。
