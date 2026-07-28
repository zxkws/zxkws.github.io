import { useCallback, useEffect, useMemo, useState } from 'react';
import { getErrorStatus } from '@zxkws/shared-fetch';
import client from '../db-ops/http/client';
import './styles.css';

type AuthState = 'pending' | 'ok' | 'need-login' | 'forbidden' | 'error';
type Capability = 'text' | 'vision' | 'speech-to-text' | 'text-to-speech' | 'embedding' | 'image' | 'video';

type AiModel = {
  id: string;
  [key: string]: unknown;
};

type ModelTest = {
  id: number;
  channelId: number;
  model: string;
  capability: Capability;
  endpoint: string;
  success: boolean;
  statusCode?: number;
  latencyMs?: number;
  result: string;
  testedAt?: string;
};

type AiChannel = {
  id: number;
  name: string;
  type: string;
  baseUrl: string;
  enabled: boolean;
  hasApiKey: boolean;
  apiKey?: string;
  models: AiModel[];
  tests: ModelTest[];
  lastModelSyncResult?: string;
  lastModelSyncAt?: string;
};

type CapabilityBinding = {
  capability: Capability;
  channelId: number;
  model: string;
};

type BindingDraft = Partial<Record<Capability, { channelId: number | ''; model: string }>>;

const capabilities: Array<[Capability, string]> = [
  ['text', '文本'],
  ['vision', '视觉'],
  ['speech-to-text', '语音转文字'],
  ['text-to-speech', '文字转语音'],
  ['embedding', '向量嵌入'],
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
  if (value.includes('whisper') || value.includes('transcri')) return 'speech-to-text';
  if (value.includes('tts') || value.includes('speech')) return 'text-to-speech';
  if (value.includes('embed') || value.includes('bge-')) return 'embedding';
  return 'text';
};

export default function AiAdminApp() {
  const [authState, setAuthState] = useState<AuthState>('pending');
  const [channels, setChannels] = useState<AiChannel[]>([]);
  const [bindings, setBindings] = useState<BindingDraft>({});
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState<Record<number, string>>({});
  const [testCapabilities, setTestCapabilities] = useState<Record<string, Capability>>({});
  const [newChannel, setNewChannel] = useState({ name: '', baseUrl: '', apiKey: '' });

  const loadData = useCallback(async () => {
    const [channelPayload, bindingPayload] = await Promise.all([
      client('/ai/admin/channels', undefined, { method: 'GET' }),
      client('/ai/admin/bindings', undefined, { method: 'GET' }),
    ]);
    const channelList = unwrap<AiChannel[]>(channelPayload);
    const bindingList = unwrap<CapabilityBinding[]>(bindingPayload);
    setChannels(Array.isArray(channelList) ? channelList.map((channel) => ({ ...channel, apiKey: '' })) : []);
    setBindings(
      Object.fromEntries(
        (Array.isArray(bindingList) ? bindingList : []).map((binding) => [
          binding.capability,
          { channelId: binding.channelId, model: binding.model },
        ]),
      ),
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
        await loadData();
      } catch (error) {
        const code = getErrorStatus(error);
        setAuthState(code === 401 ? 'need-login' : code === 403 ? 'forbidden' : 'error');
        setStatus(error instanceof Error ? error.message : String(error));
      }
    };
    load();
  }, [loadData]);

  const setActionBusy = (key: string, value: boolean) => {
    setBusy((current) => ({ ...current, [key]: value }));
  };

  const updateChannelDraft = (id: number, patch: Partial<AiChannel>) => {
    setChannels((current) => current.map((channel) => (channel.id === id ? { ...channel, ...patch } : channel)));
  };

  const createChannel = async () => {
    const key = 'create';
    setActionBusy(key, true);
    setStatus('');
    try {
      await client('/ai/admin/channels', newChannel, { method: 'POST' });
      setNewChannel({ name: '', baseUrl: '', apiKey: '' });
      await loadData();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setActionBusy(key, false);
    }
  };

  const saveChannel = async (channel: AiChannel) => {
    const key = `save:${channel.id}`;
    setActionBusy(key, true);
    setStatus('');
    try {
      const payload: { name: string; baseUrl: string; enabled: boolean; apiKey?: string } = {
        name: channel.name,
        baseUrl: channel.baseUrl,
        enabled: channel.enabled,
      };
      if (channel.apiKey) payload.apiKey = channel.apiKey;
      await client(`/ai/admin/channels/${channel.id}`, payload, { method: 'PATCH' });
      await loadData();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setActionBusy(key, false);
    }
  };

  const removeChannel = async (channel: AiChannel) => {
    if (!window.confirm(`确认删除渠道「${channel.name}」？`)) return;
    const key = `delete:${channel.id}`;
    setActionBusy(key, true);
    setStatus('');
    try {
      await client(`/ai/admin/channels/${channel.id}`, undefined, { method: 'DELETE' });
      await loadData();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setActionBusy(key, false);
    }
  };

  const refreshModels = async (channel: AiChannel) => {
    const key = `refresh:${channel.id}`;
    setActionBusy(key, true);
    setStatus('');
    try {
      await client(`/ai/admin/channels/${channel.id}/models/refresh`, undefined, { method: 'POST' });
      await loadData();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      await loadData();
    } finally {
      setActionBusy(key, false);
    }
  };

  const testModel = async (channelId: number, model: string) => {
    const rowKey = `${channelId}:${model}`;
    const key = `test:${rowKey}`;
    setActionBusy(key, true);
    setStatus('');
    try {
      const result = unwrap<ModelTest>(
        await client(
          `/ai/admin/channels/${channelId}/models/test`,
          { model, capability: testCapabilities[rowKey] || inferCapability(model) },
          { method: 'POST' },
        ),
      );
      setChannels((current) =>
        current.map((channel) => {
          if (channel.id !== channelId) return channel;
          return {
            ...channel,
            tests: [...channel.tests.filter((test) => test.model !== model), result],
          };
        }),
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setActionBusy(key, false);
    }
  };

  const saveBindings = async () => {
    const key = 'bindings';
    setActionBusy(key, true);
    setStatus('');
    try {
      const payload = capabilities
        .map(([capability]) => ({ capability, ...bindings[capability] }))
        .filter(
          (binding): binding is CapabilityBinding => typeof binding.channelId === 'number' && Boolean(binding.model),
        );
      await client('/ai/admin/bindings', { bindings: payload }, { method: 'PUT' });
      await loadData();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setActionBusy(key, false);
    }
  };

  const enabledChannels = useMemo(() => channels.filter((channel) => channel.enabled), [channels]);

  if (authState !== 'ok') {
    const message =
      authState === 'pending'
        ? '正在校验权限...'
        : authState === 'need-login'
          ? '请先登录'
          : authState === 'forbidden'
            ? '仅管理员可以使用 AI 模型配置'
            : status || '服务暂不可用';
    return <div className="ai-admin-state">{message}</div>;
  }

  return (
    <main className="ai-admin-root">
      <header className="ai-admin-header">
        <div>
          <h1>AI 渠道与模型</h1>
          <p>管理多个 OpenAI-compatible 渠道，为每种能力指定渠道和模型，并逐个验证模型。</p>
        </div>
        <button disabled={Object.values(busy).some(Boolean)} onClick={loadData}>
          重新加载
        </button>
      </header>

      <section className="ai-bindings-section">
        <div className="section-heading">
          <div>
            <h2>默认能力路由</h2>
            <p>每种能力可以使用不同渠道。</p>
          </div>
          <button disabled={busy.bindings} onClick={saveBindings}>
            保存能力路由
          </button>
        </div>
        <div className="ai-binding-grid">
          {capabilities.map(([capability, label]) => {
            const binding = bindings[capability] || { channelId: '', model: '' };
            const channel = channels.find((item) => item.id === binding.channelId);
            const modelIds = (channel?.models || []).map((model) => model.id);
            return (
              <div className="ai-binding-row" key={capability}>
                <strong>{label}</strong>
                <select
                  aria-label={`${label}渠道`}
                  value={binding.channelId}
                  onChange={(event) =>
                    setBindings((current) => ({
                      ...current,
                      [capability]: {
                        channelId: event.target.value ? Number(event.target.value) : '',
                        model: binding.model,
                      },
                    }))
                  }
                >
                  <option value="">请选择渠道</option>
                  {enabledChannels.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={`${label}模型`}
                  autoComplete="off"
                  list={`ai-model-options-${capability}`}
                  placeholder="搜索或输入模型"
                  value={binding.model}
                  onChange={(event) =>
                    setBindings((current) => ({
                      ...current,
                      [capability]: { channelId: binding.channelId, model: event.target.value },
                    }))
                  }
                />
                <datalist id={`ai-model-options-${capability}`}>
                  {modelIds.map((model) => (
                    <option key={model} value={model} />
                  ))}
                </datalist>
              </div>
            );
          })}
        </div>
      </section>

      <section className="ai-new-channel">
        <div className="section-heading">
          <div>
            <h2>新增渠道</h2>
            <p>渠道保存后再同步模型。</p>
          </div>
        </div>
        <div className="ai-channel-form">
          <label>
            <span>名称</span>
            <input
              value={newChannel.name}
              onChange={(event) => setNewChannel((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label>
            <span>Base URL</span>
            <input
              value={newChannel.baseUrl}
              onChange={(event) => setNewChannel((current) => ({ ...current, baseUrl: event.target.value }))}
            />
          </label>
          <label>
            <span>API Key</span>
            <input
              type="password"
              value={newChannel.apiKey}
              onChange={(event) => setNewChannel((current) => ({ ...current, apiKey: event.target.value }))}
            />
          </label>
          <button disabled={busy.create} onClick={createChannel}>
            新增渠道
          </button>
        </div>
      </section>

      <div className="ai-channel-list">
        {channels.map((channel) => {
          const keyword = search[channel.id]?.toLowerCase() || '';
          const filteredModels = channel.models.filter((model) => !keyword || model.id.toLowerCase().includes(keyword));
          const tests = new Map(channel.tests.map((test) => [test.model, test]));
          return (
            <section className="ai-channel-card" key={channel.id}>
              <div className="section-heading">
                <div>
                  <h2>{channel.name}</h2>
                  <p>{channel.type}</p>
                </div>
                <label className="ai-enabled-control">
                  <input
                    type="checkbox"
                    checked={channel.enabled}
                    onChange={(event) => updateChannelDraft(channel.id, { enabled: event.target.checked })}
                  />
                  启用
                </label>
              </div>

              <div className="ai-channel-form">
                <label>
                  <span>名称</span>
                  <input
                    value={channel.name}
                    onChange={(event) => updateChannelDraft(channel.id, { name: event.target.value })}
                  />
                </label>
                <label>
                  <span>Base URL</span>
                  <input
                    value={channel.baseUrl}
                    onChange={(event) => updateChannelDraft(channel.id, { baseUrl: event.target.value })}
                  />
                </label>
                <label>
                  <span>API Key</span>
                  <input
                    type="password"
                    value={channel.apiKey || ''}
                    placeholder={channel.hasApiKey ? '已配置，留空则不修改' : ''}
                    onChange={(event) => updateChannelDraft(channel.id, { apiKey: event.target.value })}
                  />
                </label>
                <div className="ai-channel-actions">
                  <button disabled={busy[`save:${channel.id}`]} onClick={() => saveChannel(channel)}>
                    保存
                  </button>
                  <button disabled={busy[`refresh:${channel.id}`]} onClick={() => refreshModels(channel)}>
                    同步模型
                  </button>
                  <button
                    className="danger"
                    disabled={busy[`delete:${channel.id}`]}
                    onClick={() => removeChannel(channel)}
                  >
                    删除
                  </button>
                </div>
              </div>

              <div className="ai-model-toolbar">
                <input
                  aria-label={`${channel.name}搜索模型`}
                  placeholder="搜索模型"
                  value={search[channel.id] || ''}
                  onChange={(event) => setSearch((current) => ({ ...current, [channel.id]: event.target.value }))}
                />
                <span>模型数：{channel.models.length}</span>
                <span>最近同步：{channel.lastModelSyncAt}</span>
              </div>

              {channel.lastModelSyncResult && channel.models.length === 0 && (
                <pre className="ai-raw-result">{channel.lastModelSyncResult}</pre>
              )}

              <div className="ai-model-table-wrap">
                <table className="ai-model-table">
                  <thead>
                    <tr>
                      <th>模型</th>
                      <th>测试能力</th>
                      <th>操作</th>
                      <th>状态码</th>
                      <th>耗时(ms)</th>
                      <th>测试结果</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModels.map((model) => {
                      const rowKey = `${channel.id}:${model.id}`;
                      const test = tests.get(model.id);
                      return (
                        <tr key={model.id}>
                          <td>{model.id}</td>
                          <td>
                            <select
                              aria-label={`${model.id}测试能力`}
                              value={testCapabilities[rowKey] || test?.capability || inferCapability(model.id)}
                              onChange={(event) =>
                                setTestCapabilities((current) => ({
                                  ...current,
                                  [rowKey]: event.target.value as Capability,
                                }))
                              }
                            >
                              {capabilities.map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <button disabled={busy[`test:${rowKey}`]} onClick={() => testModel(channel.id, model.id)}>
                              {busy[`test:${rowKey}`] ? '测试中' : '测试'}
                            </button>
                          </td>
                          <td>{test?.statusCode}</td>
                          <td>{test?.latencyMs}</td>
                          <td>
                            {test && (
                              <details open={!test.success}>
                                <summary>{String(test.success)}</summary>
                                <pre className="ai-raw-result">{test.result}</pre>
                              </details>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      {channels.length === 0 && <p className="ai-empty">暂无渠道</p>}
      <p className="ai-admin-status">{status}</p>
    </main>
  );
}
