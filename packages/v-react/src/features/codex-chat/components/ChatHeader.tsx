import clsx from 'clsx';
import { useMemo } from 'react';

import { MODEL_GROUPS } from '../constants/models';
import type { Conversation, EnsembleMode, EnsembleViewMode, ToolConfig } from '../types';

type ModelOption = { value: string; label: string };

const IconSparkles = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path
      d="M9 1.5 7.5 6 3 7.5 7.5 9 9 13.5 10.5 9 15 7.5 10.5 6 9 1.5Z"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconStop = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <rect x="4.2" y="4.2" width="7.6" height="7.6" rx="1.2" fill="currentColor" />
  </svg>
);

type ChatHeaderProps = {
  activeConversation: Conversation | null;
  isGenerating: boolean;
  modelOptions: ModelOption[];
  onNewConversation: () => void;
  onDuplicateConversation: () => void;
  onClearConversation: () => void;
  onCancelGeneration: () => void;
  onToggleSidebar: () => void;
  onToggleContextPanel: () => void;
  onToggleWorkspacePanel: () => void;
  onModelChange: (modelId: string) => void;
  onTemperatureChange: (value: number) => void;
  onToggleTool: (tool: keyof ToolConfig, value: boolean) => void;
  onEnsembleEnabledChange: (enabled: boolean) => void;
  onEnsembleModelRefsChange: (modelRefs: string[]) => void;
  onEnsembleModeChange: (mode: EnsembleMode) => void;
  onEnsembleJudgeModelRefChange: (modelRef: string | null) => void;
  onEnsembleViewModeChange: (mode: EnsembleViewMode) => void;
};

export default function ChatHeader({
  activeConversation,
  isGenerating,
  modelOptions,
  onNewConversation,
  onDuplicateConversation,
  onClearConversation,
  onCancelGeneration,
  onToggleSidebar,
  onToggleContextPanel,
  onToggleWorkspacePanel,
  onModelChange,
  onTemperatureChange,
  onToggleTool,
  onEnsembleEnabledChange,
  onEnsembleModelRefsChange,
  onEnsembleModeChange,
  onEnsembleJudgeModelRefChange,
  onEnsembleViewModeChange,
}: ChatHeaderProps) {
  const currentModel = activeConversation?.settings.model ?? MODEL_GROUPS[0]?.models[0]?.id;
  const ensembleEnabled = Boolean(activeConversation?.settings.ensemble?.enabled);
  const ensembleModelRefs = activeConversation?.settings.ensemble?.modelRefs ?? [];
  const ensembleMode = activeConversation?.settings.ensemble?.mode ?? 'compare';
  const ensembleJudgeModelRef = activeConversation?.settings.ensemble?.judgeModelRef ?? null;
  const ensembleViewMode = activeConversation?.settings.ensemble?.viewMode ?? 'auto';

  const modelDescription = useMemo(() => {
    const found = modelOptions.find((opt) => opt.value === currentModel);
    if (found) {
      return { label: found.label, description: '' };
    }
    for (const group of MODEL_GROUPS) {
      const item = group.models.find((model) => model.id === currentModel);
      if (item) return item;
    }
    return { label: currentModel, description: '' };
  }, [currentModel]);

  const resolvedModelOptions = modelOptions.length > 0
    ? modelOptions
    : MODEL_GROUPS.flatMap((group) => group.models.map((model) => ({ value: model.id, label: model.label })));

  const resolvedEnsembleRefs = ensembleModelRefs.filter(Boolean);
  const toggleEnsembleModel = (value: string) => {
    const exists = resolvedEnsembleRefs.includes(value);
    const next = exists ? resolvedEnsembleRefs.filter((v) => v !== value) : [...resolvedEnsembleRefs, value];
    onEnsembleModelRefsChange(next);
  };

  return (
    <header className="chat-header">
      <div className="chat-header-top">
        <div className="brand">
          <span className="brand-logo">CX</span>
          <div>
            <div className="title" style={{ fontWeight: 600, fontSize: 18 }}>
              Codex 对话空间
            </div>
            <div className="tagline">
              {modelDescription
                ? ensembleEnabled
                  ? `已选择 ${resolvedEnsembleRefs.length} 个模型 · ${ensembleMode}`
                  : `${modelDescription.label}${modelDescription.description ? ` · ${modelDescription.description}` : ''}`
                : '选择一个模型开始创作，或上传上下文以增强回答效果。'}
            </div>
          </div>
        </div>
        <div className="chat-header-actions">
          <button type="button" className="secondary-button" onClick={onToggleSidebar}>
            菜单
          </button>
          <button type="button" className="secondary-button" onClick={onToggleContextPanel}>
            上下文
          </button>
          <button type="button" className="secondary-button" onClick={onToggleWorkspacePanel}>
            工作区
          </button>
          <button type="button" className="secondary-button" onClick={onDuplicateConversation}>
            复制会话
          </button>
          <button type="button" className="secondary-button" onClick={onClearConversation}>
            清空会话
          </button>
          <button type="button" className="primary-button" onClick={onNewConversation}>
            <IconSparkles /> 发起新对话
          </button>
          {isGenerating && (
            <button type="button" className="secondary-button" onClick={onCancelGeneration}>
              <IconStop /> 停止生成
            </button>
          )}
        </div>
      </div>

      <div className="model-settings-panel">
        <div className="setting-block">
          <h4>模型</h4>
          <div className="model-select">
            <label className="hint-text" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={ensembleEnabled}
                onChange={(event) => onEnsembleEnabledChange(event.target.checked)}
              />
              多模型
            </label>

            {!ensembleEnabled ? (
              <select value={currentModel} onChange={(event) => onModelChange(event.target.value)} aria-label="选择模型">
                {resolvedModelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                <div className="hint-text">已选：{resolvedEnsembleRefs.length}</div>
                <div style={{ display: 'grid', gap: 6, maxHeight: 140, overflow: 'auto', paddingRight: 6 }}>
                  {resolvedModelOptions.map((opt) => (
                    <label key={opt.value} className="hint-text" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={resolvedEnsembleRefs.includes(opt.value)}
                        onChange={() => toggleEnsembleModel(opt.value)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label className="hint-text">
                    模式
                    <select
                      value={ensembleMode}
                      onChange={(event) => onEnsembleModeChange(event.target.value as EnsembleMode)}
                      aria-label="选择模式"
                    >
                      <option value="compare">compare</option>
                      <option value="deliberate">deliberate</option>
                    </select>
                  </label>
                  <label className="hint-text">
                    视图
                    <select
                      value={ensembleViewMode}
                      onChange={(event) => onEnsembleViewModeChange(event.target.value as EnsembleViewMode)}
                      aria-label="选择视图"
                    >
                      <option value="auto">auto</option>
                      <option value="columns">columns</option>
                      <option value="tabs">tabs</option>
                    </select>
                  </label>
                </div>

                {ensembleMode === 'deliberate' && (
                  <label className="hint-text">
                    裁决模型
                    <select
                      value={ensembleJudgeModelRef ?? ''}
                      onChange={(event) => onEnsembleJudgeModelRefChange(event.target.value ? event.target.value : null)}
                      aria-label="选择裁决模型"
                    >
                      <option value="">（不启用裁决）</option>
                      {resolvedModelOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="setting-block">
          <h4>温度</h4>
          <p>控制创造力与确定性，值越大输出越发散。</p>
          <div className="temperature-slider">
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={activeConversation?.settings.temperature ?? 0.6}
              onChange={(event) => onTemperatureChange(Number(event.target.value))}
              aria-label="设置温度"
            />
            <span>{(activeConversation?.settings.temperature ?? 0.6).toFixed(1)}</span>
          </div>
        </div>

        <div className="setting-block">
          <h4>工具</h4>
          <p>结合多种能力构建智能体工作流。</p>
          <div className="tool-toggle-group">
            {(
              [
                { key: 'codeInterpreter', label: '代码解释器', description: '执行 Python / JS 代码' },
                { key: 'fileSearch', label: '文件检索', description: '索引上传的知识库' },
                { key: 'webBrowsing', label: '联网搜索', description: '实时获取最新资料' },
              ] as Array<{ key: keyof ToolConfig; label: string; description: string }>
            ).map((tool) => (
              <button
                key={tool.key}
                type="button"
                className={clsx('tool-toggle', activeConversation?.tools?.[tool.key] && 'active')}
                onClick={() => onToggleTool(tool.key, !activeConversation?.tools?.[tool.key])}
                title={tool.description}
              >
                {tool.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
