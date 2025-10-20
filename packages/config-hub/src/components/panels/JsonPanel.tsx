import { useState } from 'react';
import './JsonPanel.css';

interface JsonPanelProps {
  json: string;
}

export const JsonPanel = ({ json }: JsonPanelProps) => {
  const [expanded, setExpanded] = useState(true);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(json).catch((error) => console.error('复制失败', error));
    }
  };

  return (
    <section className="json-panel">
      <header>
        <div>
          <h3>配置预览</h3>
          <p>生成的系统配置 JSON，可用于发布或备份。</p>
        </div>
        <div className="json-panel-actions">
          <button onClick={() => setExpanded((prev) => !prev)}>{expanded ? '折叠' : '展开'}</button>
          <button onClick={handleCopy}>复制</button>
        </div>
      </header>
      {expanded && (
        <pre>
          <code>{json}</code>
        </pre>
      )}
    </section>
  );
};
