# Codex 模型对话微应用

Codex 模型对话微应用提供了一个接近 [ChatGPT Codex](https://chatgpt.com/codex) 的界面体验，支持多会话管理、模型切换、工具控制与富文本渲染。该前端以 React + Vite 构建，可独立运行，也可作为主应用的微前端挂载。

## 功能亮点

- 🎛️ **模型与参数面板**：在顶部快速切换模型、调节温度，查看上下文窗口信息。
- 🧰 **工具开关**：一键启用/禁用代码解释器、文件检索、联网搜索等能力，方便与后端工具链对接。
- 💬 **对话体验**：支持 Markdown/GFM 渲染、代码高亮、工具调用结果展示、消息复制与重新生成。
- 📁 **附件草稿**：允许在发送前添加多个附件（前端保存文件对象，发送时会附带元信息）。
- 🗃️ **多会话管理**：侧边栏展示最近会话，可重命名、复制、删除或快速创建新会话，并自动根据更新时间排序。
- 🧠 **本地持久化**：对话与配置存储在 `localStorage` 中，即便刷新页面也能恢复。

## 开发与调试

```bash
pnpm install
pnpm --filter codex-chat-app dev
```

Vite 开发服务器默认监听 `http://localhost:5180`，并自动设置跨域头，便于作为微应用在主应用中调试。

## 与服务端的集成约定

前端会调用 `POST /api/codex/chat` 接口获取模型回复（可通过 `VITE_CODEX_CHAT_API_BASE` 环境变量或 `window.__CODEX_CHAT_CONFIG__.apiBaseUrl` 覆盖基础地址）。请求体与响应体约定如下：

### 请求体

```jsonc
{
  "conversationId": "conv_xxx",
  "settings": {
    "model": "gpt-4.1-mini",
    "temperature": 0.6,
    "maxOutputTokens": null,
  },
  "tools": {
    "codeInterpreter": true,
    "fileSearch": false,
    "webBrowsing": false,
  },
  "messages": [
    { "id": "msg_1", "role": "user", "content": "帮我写个冒泡排序", "createdAt": "2025-01-01T00:00:00.000Z" },
  ],
  "attachments": [{ "id": "att_1", "name": "data.csv", "size": 10240, "type": "text/csv" }],
  "stream": false,
}
```

> 💡 **附件处理**：前端暂未上传文件内容，只会附带元信息。服务端需要提供单独的上传/引用机制，并在收到 `attachments` 后自行关联真实文件内容。

### 响应体

```jsonc
{
  "message": {
    "content": "这是模型回复的正文，支持 Markdown。",
    "toolCalls": [
      {
        "id": "tool_1",
        "type": "code_interpreter",
        "input": "print(1 + 1)",
        "output": "2",
        "createdAt": "2025-01-01T00:00:01.000Z",
      },
    ],
    "status": "completed",
  },
  "usage": {
    "promptTokens": 123,
    "completionTokens": 456,
    "totalTokens": 579,
  },
  "latencyMs": 1800,
  "cached": false,
}
```

- `status` 可选值：`pending`、`streaming`、`completed`、`error`。
- `toolCalls` 用于回显诸如代码解释器或联网检索的执行结果。
- 返回体若不符合 schema，前端会提示“服务端返回的结构不符合协议”。

### 需要后端实现的扩展能力

| 功能           | 说明                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| 模型回复接口   | 实现 `POST /api/codex/chat`，可选支持 SSE 流式推送（前端预留 `stream` 字段用于扩展）。                  |
| 附件上传与引用 | 提供文件上传接口，返回可在 `attachments` 中引用的 `id`，或在 `/api/codex/chat` 中同时接收元信息与内容。 |
| 历史同步       | 若需云端同步会话，可在服务端落库并返回持久化 ID，前端通过配置中心注入用户态信息。                       |
| 安全校验       | 建议对请求附带的模型 ID、工具开关进行校验，并限制高风险指令。                                           |

## 构建与部署

```bash
pnpm --filter codex-chat-app build
```

构建产物位于 `packages/codex-chat-app/dist`，生产环境需通过主应用或独立服务器将其部署到 `/codex-chat-app/` 路径。

## 目录结构

```
packages/codex-chat-app
├── src
│   ├── components      # 侧边栏、消息列表、输入框等 UI 组件
│   ├── constants       # 模型定义等常量
│   ├── hooks           # 对话状态管理（含本地存储）
│   ├── services        # 与服务端交互、数据校验
│   ├── utils           # ID 生成与本地持久化工具
│   └── App.tsx         # 路由与页面骨架
└── vite.config.ts
```

欢迎在此基础上接入真实模型与工具链，构建属于你的 Codex 工作台。
