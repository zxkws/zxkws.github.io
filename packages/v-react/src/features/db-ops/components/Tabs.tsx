import type { ReactNode } from 'react';

export type TabItem = {
  key: string;
  label: ReactNode;
  badge?: number;
};

export default function Tabs({
  items,
  activeKey,
  onChange,
}: {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="tabs" role="tablist" aria-label="tabs">
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            className={`tab ${active ? 'active' : ''}`}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
          >
            <span className="tab-label">{item.label}</span>
            {typeof item.badge === 'number' && <span className="tab-badge">{item.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

