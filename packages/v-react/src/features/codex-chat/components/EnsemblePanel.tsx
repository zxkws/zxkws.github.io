import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

import type { EnsembleFinalOutput, EnsembleModelOutput, EnsembleState, EnsembleViewMode } from '../types';
import Markdown from './Markdown';

const resolveAutoViewMode = (modelCount: number): Exclude<EnsembleViewMode, 'auto'> => {
  if (typeof window !== 'undefined') {
    try {
      if (window.matchMedia?.('(max-width: 768px)')?.matches) {
        return 'tabs';
      }
    } catch {
      // ignore
    }
  }
  if (modelCount > 3) return 'tabs';
  return 'columns';
};

const StatusPill = ({ status }: { status: string }) => (
  <span className={clsx('ensemble-status', status)}>{status === 'streaming' ? '生成中' : status === 'completed' ? '完成' : status === 'error' ? '失败' : '等待'}</span>
);

const ModelCard = ({ output }: { output: EnsembleModelOutput }) => (
  <div className="ensemble-card">
    <div className="ensemble-card-header">
      <div className="ensemble-card-title">{output.modelRef}</div>
      <StatusPill status={output.status} />
    </div>
    {output.error && <div className="ensemble-error">{output.error}</div>}
    <div className="ensemble-card-body">
      <Markdown content={output.content || (output.status === 'pending' ? '...' : '')} />
    </div>
  </div>
);

const FinalCard = ({ final }: { final: EnsembleFinalOutput }) => (
  <div className="ensemble-final">
    <div className="ensemble-card-header">
      <div className="ensemble-card-title">最终答案 · {final.modelRef}</div>
      <StatusPill status={final.status} />
    </div>
    {final.error && <div className="ensemble-error">{final.error}</div>}
    <div className="ensemble-card-body">
      <Markdown content={final.content || (final.status === 'pending' ? '...' : '')} />
    </div>
  </div>
);

export default function EnsemblePanel({ ensemble }: { ensemble: EnsembleState }) {
  const outputs = ensemble.outputs ?? [];
  const modelCount = outputs.length;
  const resolvedMode = ensemble.viewMode === 'auto' ? resolveAutoViewMode(modelCount) : ensemble.viewMode;
  const [activeTab, setActiveTab] = useState(() => outputs[0]?.modelRef ?? '');

  useEffect(() => {
    if (!activeTab || !outputs.some((o) => o.modelRef === activeTab)) {
      setActiveTab(outputs[0]?.modelRef ?? '');
    }
  }, [activeTab, outputs]);

  const activeOutput = useMemo(() => outputs.find((o) => o.modelRef === activeTab) ?? outputs[0], [activeTab, outputs]);

  return (
    <section className="ensemble-panel">
      <div className="ensemble-panel-header">
        <div className="ensemble-panel-title">多模型输出 · {ensemble.mode}</div>
        <div className="ensemble-panel-meta">
          <span className="hint-text">模型数：{modelCount}</span>
          <span className="hint-text">视图：{resolvedMode}</span>
        </div>
      </div>

      {resolvedMode === 'columns' && (
        <div className="ensemble-columns">
          {outputs.map((output) => (
            <ModelCard key={output.modelRef} output={output} />
          ))}
        </div>
      )}

      {resolvedMode === 'tabs' && (
        <div className="ensemble-tabs">
          <div className="ensemble-tabbar">
            {outputs.map((output) => (
              <button
                key={output.modelRef}
                type="button"
                className={clsx('ensemble-tab', activeTab === output.modelRef && 'active')}
                onClick={() => setActiveTab(output.modelRef)}
              >
                <span className="truncate">{output.modelRef}</span>
                <StatusPill status={output.status} />
              </button>
            ))}
          </div>
          {activeOutput && <ModelCard output={activeOutput} />}
        </div>
      )}

      {ensemble.final && <FinalCard final={ensemble.final} />}
    </section>
  );
}

