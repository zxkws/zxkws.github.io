import { useCallback, useEffect, useState } from 'react';
import { getErrorStatus } from '@zxkws/shared-fetch';
import client from '../db-ops/http/client';
import './styles.css';

type AuthState = 'pending' | 'ok' | 'need-login' | 'forbidden' | 'error';
type Capability = 'text' | 'vision' | 'speech-to-text' | 'text-to-speech' | 'image' | 'video';
type ModelSelections = Partial<Record<Capability, string>>;
type AiConfig = {
  baseUrl?: string;
  hasApiKey?: boolean;
  models?: ModelSelections;
};
type AiModel = {
  id: string;
};

const capabilities: Array<[Capability, string]> = [
  ['text', '文本'],
  ['vision', '视觉'],
  ['speech-to-text', '语音转文字'],
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

export default function AiAdminApp() {
  const [authState, setAuthState] = useState<AuthState>('pending');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [models, setModels] = useState<ModelSelections>({});
  const [availableModels, setAvailableModels] = useState<AiModel[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const loadConfig = useCallback(async () => {
    const config = unwrap<AiConfig>(await client('/ai/admin/config', undefined, { method: 'GET' }));
    setBaseUrl(config?.baseUrl ?? '');
    setHasApiKey(Boolean(config?.hasApiKey));
    setModels(config?.models ?? {});
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
        await loadConfig();
      } catch (error) {
        const code = getErrorStatus(error);
        setAuthState(code === 401 ? 'need-login' : code === 403 ? 'forbidden' : 'error');
        setStatus(error instanceof Error ? error.message : String(error));
      }
    };
    load();
  }, [loadConfig]);

  const refreshModels = async () => {
    setLoading(true);
    setStatus('正在获取模型...');
    try {
      const payload: { baseUrl?: string; apiKey?: string } = { baseUrl };
      if (apiKey) payload.apiKey = apiKey;
      const result = unwrap<AiModel[]>(await client('/ai/admin/models/refresh', payload, { method: 'POST' }));
      const list = Array.isArray(result) ? result : [];
      setAvailableModels(list);
      setStatus('模型获取成功');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setLoading(true);
    setStatus('正在保存...');
    try {
      const payload: { baseUrl: string; apiKey?: string; models: ModelSelections } = { baseUrl, models };
      if (apiKey) payload.apiKey = apiKey;
      await client('/ai/admin/config', payload, { method: 'PUT' });
      setApiKey('');
      setHasApiKey(true);
      setStatus('保存成功');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

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

  const ids = availableModels.map((model) => model.id);
  return (
    <main className="ai-admin-root">
      <header>
        <div>
          <h1>AI 模型配置</h1>
          <p>配置 OpenAI-compatible 服务，并为不同能力指定模型。</p>
        </div>
      </header>

      <section>
        <label>
          <span>Base URL</span>
          <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
        </label>
        <label>
          <span>API Key</span>
          <input
            type="password"
            value={apiKey}
            placeholder={hasApiKey ? '已配置，留空则不修改' : ''}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </label>
        <button disabled={loading} onClick={refreshModels}>
          获取模型
        </button>
      </section>

      <section className="ai-model-grid">
        {capabilities.map(([capability, label]) => (
          <label key={capability}>
            <span>{label}</span>
            <select
              value={models[capability] ?? ''}
              onChange={(event) => setModels((previous) => ({ ...previous, [capability]: event.target.value }))}
            >
              <option value="">请选择模型</option>
              {models[capability] && !ids.includes(models[capability] as string) && (
                <option value={models[capability]}>{models[capability]}</option>
              )}
              {ids.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
        ))}
      </section>

      <div className="ai-admin-actions">
        <button disabled={loading} onClick={loadConfig}>
          重新加载
        </button>
        <button disabled={loading} onClick={save}>
          保存配置
        </button>
      </div>
      <p className="ai-admin-status">{status}</p>
    </main>
  );
}
