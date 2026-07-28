import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getErrorStatus } from '@zxkws/shared-fetch';
import client from '../db-ops/http/client';
import { type AgentRunEvent, type AgentRunResult, streamAgentRun } from './agent-runtime';
import './styles.css';

type AuthState = 'pending' | 'ok' | 'need-login' | 'forbidden' | 'error';
type Capability = 'text' | 'vision' | 'text-to-speech' | 'image' | 'video';

type AiModel = {
  id: string;
  [key: string]: unknown;
};

type AiChannel = {
  id: number;
  name: string;
  baseUrl: string;
  enabled: boolean;
  models: AiModel[];
};

type AgentSkill = {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
};

type AgentMcpServer = {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
  allowedTools?: string[] | null;
};

type KnowledgeBase = {
  id: string;
  name: string;
};

type DebugResult = {
  channelId: number;
  channelName: string;
  model: string;
  capability: Capability;
  endpoint: string;
  success: boolean;
  statusCode?: number;
  latencyMs: number;
  contentType?: string;
  result: string;
  audioBase64?: string;
  byteLength?: number;
};

type HistoryItem = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  result?: DebugResult;
  agentRun?: AgentRunResult;
  agentEvents?: AgentRunEvent[];
};

const capabilityOptions: Array<[Capability, string]> = [
  ['text', '文本对话'],
  ['vision', '视觉理解'],
  ['text-to-speech', '文字转语音'],
  ['image', '图片生成'],
  ['video', '视频生成'],
];

const unwrap = <T,>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

const inferCapability = (model: string): Capability => {
  const value = model.toLowerCase();
  if (value.includes('video')) return 'video';
  if (value.includes('image') || value.includes('imagine')) return 'image';
  if (value.includes('tts') || value.includes('speech')) return 'text-to-speech';
  if (value.includes('vision') || value.includes('vl')) return 'vision';
  return 'text';
};

const assistantContent = (raw: string) => {
  try {
    const body = JSON.parse(raw) as {
      choices?: Array<{ message?: { content?: string } }>;
      output_text?: string;
    };
    return body.choices?.[0]?.message?.content || body.output_text || raw;
  } catch {
    return raw;
  }
};

const toggleId = (values: string[], id: string) =>
  values.includes(id) ? values.filter((item) => item !== id) : [...values, id];

export default function ModelPlaygroundApp() {
  const [authState, setAuthState] = useState<AuthState>('pending');
  const [channels, setChannels] = useState<AiChannel[]>([]);
  const [channelId, setChannelId] = useState<number | ''>('');
  const [model, setModel] = useState('');
  const [capability, setCapability] = useState<Capability>('text');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [input, setInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [maxTokens, setMaxTokens] = useState(4096);
  const [temperature, setTemperature] = useState(0.5);
  const [topP, setTopP] = useState(1);
  const [multiTurn, setMultiTurn] = useState(true);
  const [voice, setVoice] = useState('alloy');
  const [speed, setSpeed] = useState(1);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsStatus, setModelsStatus] = useState('');
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [mcpServers, setMcpServers] = useState<AgentMcpServer[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [mcpServerIds, setMcpServerIds] = useState<string[]>([]);
  const [knowledgeBaseIds, setKnowledgeBaseIds] = useState<string[]>([]);
  const [approvedToolKeys, setApprovedToolKeys] = useState<string[]>([]);
  const [liveAgentEvents, setLiveAgentEvents] = useState<AgentRunEvent[]>([]);
  const streamController = useRef<AbortController | null>(null);

  const loadChannels = useCallback(async () => {
    const payload = await client('/ai/admin/channels', undefined, { method: 'GET' });
    const list = unwrap<AiChannel[]>(payload);
    const enabled = Array.isArray(list) ? list.filter((channel) => channel.enabled) : [];
    setChannels(enabled);
    setChannelId((current) =>
      current && enabled.some((channel) => channel.id === current) ? current : enabled[0]?.id || '',
    );
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const profile = unwrap<{ role?: string; roles?: Array<string | { code?: string }> }>(
          await client('/v1/user', undefined, { method: 'GET' }),
        );
        const isAdmin =
          profile.role === 'admin' ||
          profile.roles?.some((role) => (typeof role === 'string' ? role === 'admin' : role.code === 'admin'));
        if (!isAdmin) {
          setAuthState('forbidden');
          return;
        }
        setAuthState('ok');
        const [skillPayload, mcpPayload, knowledgePayload] = await Promise.all([
          client('/v1/agent/skills', undefined, { method: 'GET' }),
          client('/v1/agent/mcp-servers', undefined, { method: 'GET' }),
          client('/ai/knowledge-bases', undefined, { method: 'GET' }),
          loadChannels(),
        ]);
        const skillRows = unwrap<AgentSkill[]>(skillPayload);
        const mcpRows = unwrap<AgentMcpServer[]>(mcpPayload);
        const knowledgeRows = unwrap<KnowledgeBase[]>(knowledgePayload);
        setSkills(Array.isArray(skillRows) ? skillRows.filter((item) => item.enabled) : []);
        setMcpServers(Array.isArray(mcpRows) ? mcpRows.filter((item) => item.enabled) : []);
        setKnowledgeBases(Array.isArray(knowledgeRows) ? knowledgeRows : []);
      } catch (error) {
        const code = getErrorStatus(error);
        setAuthState(code === 401 ? 'need-login' : code === 403 ? 'forbidden' : 'error');
        setStatus(error instanceof Error ? error.message : String(error));
      }
    };
    void load();
    return () => streamController.current?.abort();
  }, [loadChannels]);

  const channel = useMemo(() => channels.find((item) => item.id === channelId), [channelId, channels]);
  const models = useMemo(() => channel?.models || [], [channel]);

  const refreshModels = useCallback(async (selectedChannelId: number) => {
    setModelsLoading(true);
    setModelsStatus('');
    try {
      const payload = await client(`/ai/admin/channels/${selectedChannelId}/models/refresh`, undefined, {
        method: 'POST',
      });
      const refreshed = unwrap<AiModel[]>(payload);
      const nextModels = Array.isArray(refreshed)
        ? refreshed.filter((item): item is AiModel => Boolean(item) && typeof item.id === 'string')
        : [];
      setChannels((current) =>
        current.map((item) => (item.id === selectedChannelId ? { ...item, models: nextModels } : item)),
      );
      setModel((current) => {
        if (current || !nextModels.length) return current;
        setCapability(inferCapability(nextModels[0].id));
        return nextModels[0].id;
      });
      setModelsStatus(`查询到 ${nextModels.length} 个模型`);
    } catch (error) {
      setModelsStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!channelId) {
      setModelsStatus('');
      return;
    }
    void refreshModels(channelId);
  }, [channelId, refreshModels]);

  const chooseModel = (next: string) => {
    setModel(next);
    setCapability(inferCapability(next));
    setHistory([]);
  };

  const usesAgentRuntime = skillIds.length > 0 || mcpServerIds.length > 0 || knowledgeBaseIds.length > 0;

  const send = async () => {
    if (!channelId || !model || !input || busy) return;
    const currentInput = input;
    setBusy(true);
    setStatus('');
    setInput('');
    const userItem: HistoryItem = { id: Date.now(), role: 'user', content: currentInput };
    setHistory((current) => [...current, userItem]);
    setLiveAgentEvents([]);
    try {
      if (usesAgentRuntime) {
        if (capability !== 'text') throw new Error('Skills、MCP 和知识库目前用于文本 Agent，请切换到文本对话');
        const controller = new AbortController();
        streamController.current = controller;
        const events: AgentRunEvent[] = [];
        const agentRun = await streamAgentRun(
          {
            input: [systemPrompt ? `角色设定：${systemPrompt}` : '', currentInput].filter(Boolean).join('\n\n'),
            channelId,
            model,
            skillIds,
            mcpServerIds,
            knowledgeBaseIds,
            approvedToolKeys,
          },
          (event) => {
            if (event.type === 'stream.end' || event.type === 'stream.result') return;
            events.push(event);
            setLiveAgentEvents([...events]);
          },
          controller.signal,
        );
        setHistory((current) => [
          ...current,
          {
            id: Date.now() + 1,
            role: 'assistant',
            content: agentRun.output || agentRun.error || '',
            agentRun,
            agentEvents: events,
          },
        ]);
        setLiveAgentEvents([]);
        return;
      }
      const result = unwrap<DebugResult>(
        await client(
          `/ai/admin/channels/${channelId}/models/debug`,
          {
            model,
            capability,
            input: currentInput,
            systemPrompt,
            maxTokens,
            temperature,
            topP,
            voice,
            speed,
            imageUrl,
            messages:
              multiTurn && (capability === 'text' || capability === 'vision')
                ? history.map((item) => ({
                    role: item.role,
                    content: item.role === 'assistant' ? assistantContent(item.content) : item.content,
                  }))
                : [],
          },
          { method: 'POST' },
        ),
      );
      setHistory((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: result.result,
          result,
        },
      ]);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      setInput(currentInput);
    } finally {
      streamController.current = null;
      setBusy(false);
    }
  };

  if (authState !== 'ok') {
    const message =
      authState === 'pending'
        ? '正在校验权限...'
        : authState === 'need-login'
          ? '请先登录'
          : authState === 'forbidden'
            ? '仅管理员可以使用模型调试中心'
            : status || '服务暂不可用';
    return <div className="model-playground-state">{message}</div>;
  }

  return (
    <main className="model-playground">
      <aside className="model-catalog">
        <div className="catalog-title">模型列表</div>
        {channels.map((item) => (
          <div className="catalog-channel" key={item.id}>
            <button
              className={item.id === channelId ? 'active' : ''}
              onClick={() => {
                setChannelId(item.id);
                setModel('');
                setModelsStatus('');
                setHistory([]);
              }}
            >
              {item.name}
            </button>
            {item.id === channelId &&
              item.models.map((itemModel) => (
                <button
                  className={`catalog-model ${itemModel.id === model ? 'active' : ''}`}
                  key={itemModel.id}
                  onClick={() => chooseModel(itemModel.id)}
                >
                  {itemModel.id}
                </button>
              ))}
          </div>
        ))}
        {!channels.length && <p className="catalog-empty">暂无已启用渠道</p>}
      </aside>

      <section className="model-settings">
        <div className="service-row">
          <strong>服务认证信息</strong>
          <span>{channel?.baseUrl}</span>
        </div>

        <label>
          <span>渠道选择</span>
          <select
            value={channelId}
            onChange={(event) => {
              setChannelId(event.target.value ? Number(event.target.value) : '');
              setModel('');
              setModelsStatus('');
              setHistory([]);
            }}
          >
            <option value="">请选择渠道</option>
            {channels.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>模型选择</span>
          <div className="model-picker">
            <input
              list="model-query-results"
              value={model}
              placeholder={models.length ? '输入关键字查询或选择模型，也可手动填写' : '可手动输入模型 ID'}
              onChange={(event) => chooseModel(event.target.value)}
            />
            <datalist id="model-query-results">
              {models.map((item) => (
                <option key={item.id} value={item.id} />
              ))}
            </datalist>
            <button
              type="button"
              disabled={!channelId || modelsLoading}
              onClick={() => {
                if (channelId) void refreshModels(channelId);
              }}
            >
              {modelsLoading ? '查询中…' : '查询模型'}
            </button>
            {modelsStatus ? <small>{modelsStatus}</small> : null}
          </div>
        </label>

        <label>
          <span>调试能力</span>
          <select value={capability} onChange={(event) => setCapability(event.target.value as Capability)}>
            {capabilityOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <section className="agent-capabilities">
          <div>
            <strong>Agent 能力</strong>
            <small>选中任意能力后，本次文本调试将通过 LangGraph Agent 真实执行。</small>
          </div>

          <fieldset>
            <legend>Skills</legend>
            {skills.map((item) => (
              <label key={item.id}>
                <input
                  type="checkbox"
                  checked={skillIds.includes(item.id)}
                  onChange={() => setSkillIds((current) => toggleId(current, item.id))}
                />
                <span>{item.name}</span>
                <code>{item.code}</code>
              </label>
            ))}
            {!skills.length && <small>暂无已启用 Skill，可到 Agent 平台创建或导入。</small>}
          </fieldset>

          <fieldset>
            <legend>MCP Servers</legend>
            {mcpServers.map((item) => (
              <div className="agent-capability-row" key={item.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={mcpServerIds.includes(item.id)}
                    onChange={() => setMcpServerIds((current) => toggleId(current, item.id))}
                  />
                  <span>{item.name}</span>
                  <code>{item.code}</code>
                </label>
                {mcpServerIds.includes(item.id) &&
                  (item.allowedTools || []).map((tool) => {
                    const toolKey = `${item.id}:${tool}`;
                    return (
                      <label className="tool-approval" key={toolKey}>
                        <input
                          type="checkbox"
                          checked={approvedToolKeys.includes(toolKey)}
                          onChange={() => setApprovedToolKeys((current) => toggleId(current, toolKey))}
                        />
                        <span>本次批准 {tool}</span>
                      </label>
                    );
                  })}
              </div>
            ))}
            {!mcpServers.length && <small>暂无已启用 MCP Server，可到 Agent 平台创建或导入。</small>}
          </fieldset>

          <fieldset>
            <legend>知识库</legend>
            {knowledgeBases.map((item) => (
              <label key={item.id}>
                <input
                  type="checkbox"
                  checked={knowledgeBaseIds.includes(item.id)}
                  onChange={() => setKnowledgeBaseIds((current) => toggleId(current, item.id))}
                />
                <span>{item.name}</span>
              </label>
            ))}
            {!knowledgeBases.length && <small>暂无知识库。</small>}
          </fieldset>
        </section>

        {(capability === 'text' || capability === 'vision') && (
          <>
            <label>
              <span>角色设定</span>
              <textarea
                rows={4}
                value={systemPrompt}
                placeholder="输入模型的角色属性"
                onChange={(event) => setSystemPrompt(event.target.value)}
              />
            </label>
            <div className="range-setting">
              <label htmlFor="max-tokens">max_tokens（回复长度限制）</label>
              <input
                id="max-tokens"
                type="range"
                min="1"
                max="32768"
                step="1"
                value={maxTokens}
                onChange={(event) => setMaxTokens(Number(event.target.value))}
              />
              <input type="number" value={maxTokens} onChange={(event) => setMaxTokens(Number(event.target.value))} />
            </div>
            <div className="range-setting">
              <label htmlFor="temperature">temperature（随机性）</label>
              <input
                id="temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(event) => setTemperature(Number(event.target.value))}
              />
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(event) => setTemperature(Number(event.target.value))}
              />
            </div>
            <div className="range-setting">
              <label htmlFor="top-p">top_p</label>
              <input
                id="top-p"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={topP}
                onChange={(event) => setTopP(Number(event.target.value))}
              />
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={topP}
                onChange={(event) => setTopP(Number(event.target.value))}
              />
            </div>
            <label className="toggle-setting">
              <span>多轮对话</span>
              <input type="checkbox" checked={multiTurn} onChange={(event) => setMultiTurn(event.target.checked)} />
            </label>
          </>
        )}

        {capability === 'vision' && (
          <label>
            <span>图片 URL</span>
            <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
          </label>
        )}

        {capability === 'text-to-speech' && (
          <>
            <label>
              <span>voice</span>
              <input value={voice} onChange={(event) => setVoice(event.target.value)} />
            </label>
            <div className="range-setting">
              <label htmlFor="speech-speed">speed</label>
              <input
                id="speech-speed"
                type="range"
                min="0.25"
                max="4"
                step="0.05"
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
              />
              <input
                type="number"
                min="0.25"
                max="4"
                step="0.05"
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
              />
            </div>
          </>
        )}
      </section>

      <section className="playground-stage">
        <header>
          <div className="stage-mark">M</div>
          <div>
            <h1>模型调试中心</h1>
            <p>调整参数并查看接入模型返回的原始结果</p>
          </div>
          <button onClick={() => setHistory([])}>清除历史记录</button>
        </header>

        <div className="debug-history">
          {!history.length && (
            <div className="debug-welcome">
              <strong>{model || '请选择模型'}</strong>
              <span>{channel?.baseUrl}</span>
            </div>
          )}
          {history.map((item) => (
            <article className={`debug-message ${item.role}`} key={item.id}>
              <div className="message-role">{item.role === 'user' ? '你' : '模型'}</div>
              {item.content && <pre>{item.content}</pre>}
              {item.result?.audioBase64 && item.result.contentType && (
                <audio controls src={`data:${item.result.contentType};base64,${item.result.audioBase64}`} />
              )}
              {item.result && (
                <div className="response-meta">
                  <span>success: {String(item.result.success)}</span>
                  <span>statusCode: {item.result.statusCode}</span>
                  <span>latencyMs: {item.result.latencyMs}</span>
                  <span>contentType: {item.result.contentType}</span>
                  <span>byteLength: {item.result.byteLength}</span>
                </div>
              )}
              {item.agentRun && (
                <div className="response-meta">
                  <span>status: {item.agentRun.status}</span>
                  <span>channelName: {item.agentRun.channelName}</span>
                  <span>model: {item.agentRun.model}</span>
                </div>
              )}
              {item.agentEvents?.length ? (
                <details className="agent-events">
                  <summary>运行事件 {item.agentEvents.length}</summary>
                  {item.agentEvents.map((event, index) => (
                    <pre key={`${event.id || index}-${event.type}`}>{JSON.stringify(event, null, 2)}</pre>
                  ))}
                </details>
              ) : null}
            </article>
          ))}
          {busy && (
            <div className="debug-pending">
              {liveAgentEvents.length
                ? liveAgentEvents.map((event) => event.message || event.type).join('\n')
                : '模型处理中...'}
            </div>
          )}
        </div>

        <div className="debug-composer">
          <textarea
            value={input}
            placeholder={
              capability === 'text-to-speech' ? '输入需要合成的文本' : '输入想要调试的内容，Shift+Enter 换行'
            }
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
          />
          <button disabled={!channelId || !model || !input || busy} onClick={send}>
            {busy ? '发送中' : '发送'}
          </button>
        </div>
        {status && <p className="playground-status">{status}</p>}
      </section>
    </main>
  );
}
