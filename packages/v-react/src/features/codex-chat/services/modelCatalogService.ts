export type ModelCatalogItem = {
  modelRef: string;
  providerKey: string;
  providerType?: string;
  modelId: string;
  displayName: string;
  capabilities?: Record<string, unknown>;
};

const resolveBase = () => {
  if (typeof window !== 'undefined') {
    const runtimeConfig = (
      window as typeof window & {
        __CODEX_CHAT_CONFIG__?: { apiBaseUrl?: string };
      }
    ).__CODEX_CHAT_CONFIG__;
    if (runtimeConfig?.apiBaseUrl) {
      const trimmed = runtimeConfig.apiBaseUrl.replace(/\/$/, '');
      if (trimmed.endsWith('/v1/ai')) return trimmed;
      if (trimmed.endsWith('/api')) return `${trimmed}/v1/ai`;
      return trimmed;
    }
  }
  if (import.meta.env.VITE_CODEX_CHAT_API_BASE) {
    const trimmed = String(import.meta.env.VITE_CODEX_CHAT_API_BASE).replace(/\/$/, '');
    if (trimmed.endsWith('/v1/ai')) return trimmed;
    if (trimmed.endsWith('/api')) return `${trimmed}/v1/ai`;
    return trimmed;
  }
  return '/api/v1/ai';
};

export async function fetchModelCatalog(options: { signal?: AbortSignal } = {}): Promise<ModelCatalogItem[]> {
  const endpoint = `${resolveBase()}/models`;
  const response = await fetch(endpoint, { method: 'GET', signal: options.signal });
  if (!response.ok) {
    throw new Error(`加载模型目录失败：${response.status}`);
  }
  const data = (await response.json()) as unknown;
  if (!Array.isArray(data)) {
    return [];
  }
  return data
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const modelRef = typeof record.modelRef === 'string' ? record.modelRef : '';
      const providerKey = typeof record.providerKey === 'string' ? record.providerKey : '';
      const modelId = typeof record.modelId === 'string' ? record.modelId : '';
      const displayName = typeof record.displayName === 'string' ? record.displayName : modelId || modelRef;
      if (!modelRef || !providerKey || !modelId) return null;
      return {
        modelRef,
        providerKey,
        providerType: typeof record.providerType === 'string' ? record.providerType : undefined,
        modelId,
        displayName,
        capabilities: typeof record.capabilities === 'object' && record.capabilities !== null ? (record.capabilities as any) : {},
      } as ModelCatalogItem;
    })
    .filter((v): v is ModelCatalogItem => Boolean(v));
}
