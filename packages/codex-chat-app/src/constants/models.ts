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
    group: '旗舰模型',
    models: [
      {
        id: 'gpt-4.1',
        label: 'GPT-4.1',
        description: '适合通用对话、知识问答与轻量推理任务',
        capability: 'general',
        contextWindow: '200K',
        latencyHint: '低延迟',
      },
      {
        id: 'gpt-4.1-mini',
        label: 'GPT-4.1 Mini',
        description: '成本优化版本，适合批量自动化与助手类应用',
        capability: 'general',
        contextWindow: '128K',
        latencyHint: '极低延迟',
      },
      {
        id: 'o4-mini',
        label: 'o4 Mini (Reasoning)',
        description: '覆盖逻辑推理与工具调用的平衡型号',
        capability: 'reasoning',
        contextWindow: '200K',
        releaseTag: 'Beta',
      },
      {
        id: 'o1',
        label: 'o1 (深度推理)',
        description: '对复杂规划、数学证明等任务具备更强的推理能力',
        capability: 'reasoning',
        contextWindow: '128K',
        latencyHint: '较高延迟',
      },
    ],
  },
  {
    group: '代码与智能体',
    models: [
      {
        id: 'gpt-4.1-coder',
        label: 'GPT-4.1 Coder',
        description: '专注于代码生成、调试及代码解释器协作场景',
        capability: 'coding',
        contextWindow: '200K',
        releaseTag: 'Preview',
      },
      {
        id: 'o3-mini-high',
        label: 'o3 Mini High',
        description: '适合编写复杂脚本、构建自动化代理',
        capability: 'coding',
        contextWindow: '128K',
      },
    ],
  },
  {
    group: '语音与多模态',
    models: [
      {
        id: 'gpt-4o-audio-preview',
        label: 'GPT-4o Audio Preview',
        description: '低延迟语音互动、实时多模态体验',
        capability: 'voice',
        contextWindow: '64K',
        releaseTag: 'Preview',
      },
    ],
  },
];

export const DEFAULT_MODEL_ID = 'gpt-4.1-mini';
