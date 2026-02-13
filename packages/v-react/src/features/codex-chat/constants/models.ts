export type ModelDefinition = {
  id: string;
  label: string;
  description: string;
  capability: 'general' | 'reasoning' | 'coding' | 'voice';
  contextWindow?: string;
  latencyHint?: string;
  releaseTag?: string;
};

export const MODEL_GROUPS: Array<{
  group: string;
  models: ModelDefinition[];
}> = [
  {
    group: '默认模型',
    models: [
      {
        id: 'dashscope:qwen-turbo-2024-06-24',
        label: 'Qwen Turbo (DashScope)',
        description: '服务端默认自举模型（OpenAI Compat）',
        capability: 'general',
      },
    ],
  },
];

export const DEFAULT_MODEL_ID = 'dashscope:qwen-turbo-2024-06-24';
