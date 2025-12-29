import clsx from 'clsx';
import { useMemo } from 'react';

import { MODEL_GROUPS } from '../constants/models';
import type { Conversation, ToolConfig } from '../types';

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
};

export default function ChatHeader({
  activeConversation,
  isGenerating,
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
}: ChatHeaderProps) {
  const currentModel = activeConversation?.settings.model ?? MODEL_GROUPS[0]?.models[0]?.id;

  const modelDescription = useMemo(() => {
    for (const group of MODEL_GROUPS) {
      const found = group.models.find((model) => model.id === currentModel);
      if (found) {
        return found;
      }
    }
    return null;
  }, [currentModel]);

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
                ? `${modelDescription.label} · ${modelDescription.description}`
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
            <select value={currentModel} onChange={(event) => onModelChange(event.target.value)} aria-label="选择模型">
              {MODEL_GROUPS.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {modelDescription?.contextWindow && (
              <span className="hint-text">上下文：{modelDescription.contextWindow}</span>
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
