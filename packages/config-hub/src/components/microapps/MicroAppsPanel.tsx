import { useEffect, useMemo, useState } from 'react';
import { MicroAppRecord, MenuItem } from '../../types';
import { createId } from '../../utils';
import './MicroAppsPanel.css';

interface MicroAppsPanelProps {
  microApps: MicroAppRecord[];
  onChange: (_next: MicroAppRecord[]) => void;
}

const createBlankMicroApp = (): MicroAppRecord => ({
  id: createId(),
  name: 'micro-app',
  displayName: '新微应用',
  entry: 'https://example.com/entry.js',
  devEntry: 'http://localhost:3000',
  prodEntry: 'https://example.com/production/',
  activeRule: ['/new-app'],
  enabled: true,
  sandbox: true,
  loadScriptMode: 'import',
});

const formatActiveRule = (rules: string[]) => rules.join('\n');

const parseActiveRule = (value: string) =>
  value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

export const MicroAppsPanel = ({ microApps, onChange }: MicroAppsPanelProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(microApps[0]?.id ?? null);

  const selected = useMemo(
    () => microApps.find((item) => item.id === selectedId) ?? microApps[0] ?? null,
    [microApps, selectedId],
  );

  useEffect(() => {
    if (!selectedId || !microApps.some((app) => app.id === selectedId)) {
      setSelectedId(microApps[0]?.id ?? null);
    }
  }, [microApps, selectedId]);

  const commit = (updater: (_app: MicroAppRecord) => MicroAppRecord) => {
    if (!selected) {
      return;
    }
    onChange(microApps.map((item) => (item.id === selected.id ? updater({ ...item }) : item)));
  };

  return (
    <section className="microapps-panel">
      <header>
        <div>
          <h3>微应用</h3>
          <p>管理微前端应用的生命周期、入口地址及菜单信息。</p>
        </div>
        <div className="microapps-actions">
          <button
            onClick={() => {
              const next = createBlankMicroApp();
              onChange([...microApps, next]);
              setSelectedId(next.id);
            }}
          >
            新增微应用
          </button>
          <button
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              onChange(microApps.filter((item) => item.id !== selected.id));
              setSelectedId((prev) => {
                if (prev === selected.id) {
                  return microApps.filter((item) => item.id !== selected.id)[0]?.id ?? null;
                }
                return prev;
              });
            }}
          >
            删除当前
          </button>
        </div>
      </header>
      <div className="microapps-content">
        <aside>
          <ul>
            {microApps.map((app) => (
              <li key={app.id} className={app.id === selected?.id ? 'active' : ''}>
                <button type="button" onClick={() => setSelectedId(app.id)}>
                  <span className="title">{app.displayName}</span>
                  <span className="subtitle">{app.name}</span>
                </button>
              </li>
            ))}
            {microApps.length === 0 && <li className="empty">尚未创建微应用。</li>}
          </ul>
        </aside>
        {selected ? (
          <form className="microapps-form" onSubmit={(event) => event.preventDefault()}>
            <div className="form-grid">
              <label>
                <span>名称 (唯一)</span>
                <input
                  value={selected.name}
                  onChange={(event) =>
                    commit((app) => ({
                      ...app,
                      name: event.target.value,
                    }))
                  }
                  placeholder="micro-app"
                />
              </label>
              <label>
                <span>显示名称</span>
                <input
                  value={selected.displayName}
                  onChange={(event) =>
                    commit((app) => ({
                      ...app,
                      displayName: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>版本号</span>
                <input
                  value={selected.version ?? ''}
                  onChange={(event) =>
                    commit((app) => ({
                      ...app,
                      version: event.target.value,
                    }))
                  }
                  placeholder="1.0.0"
                />
              </label>
              <label>
                <span>描述</span>
                <input
                  value={selected.description ?? ''}
                  onChange={(event) =>
                    commit((app) => ({
                      ...app,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                <span>入口 (通用)</span>
                <input
                  value={selected.entry}
                  onChange={(event) =>
                    commit((app) => ({
                      ...app,
                      entry: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>开发入口</span>
                <input
                  value={selected.devEntry ?? ''}
                  onChange={(event) =>
                    commit((app) => ({
                      ...app,
                      devEntry: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>生产入口</span>
                <input
                  value={selected.prodEntry ?? ''}
                  onChange={(event) =>
                    commit((app) => ({
                      ...app,
                      prodEntry: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <label className="field">
              <span>激活规则 (每行一个)</span>
              <textarea
                value={formatActiveRule(selected.activeRule)}
                onChange={(event) =>
                  commit((app) => ({
                    ...app,
                    activeRule: parseActiveRule(event.target.value),
                  }))
                }
                rows={4}
              />
            </label>
            <div className="form-grid">
              <label>
                <span>脚本加载模式</span>
                <select
                  value={selected.loadScriptMode ?? 'import'}
                  onChange={(event) =>
                    commit((app) => ({
                      ...app,
                      loadScriptMode: event.target.value as MicroAppRecord['loadScriptMode'],
                    }))
                  }
                >
                  <option value="import">import</option>
                  <option value="fetch">fetch</option>
                  <option value="script">script</option>
                </select>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={selected.enabled}
                  onChange={(event) =>
                    commit((app) => ({
                      ...app,
                      enabled: event.target.checked,
                    }))
                  }
                />
                <span>启用该微应用</span>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={Boolean(selected.sandbox)}
                  onChange={(event) =>
                    commit((app) => ({
                      ...app,
                      sandbox: event.target.checked,
                    }))
                  }
                />
                <span>开启沙箱</span>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={Boolean(selected.iframe)}
                  onChange={(event) =>
                    commit((app) => ({
                      ...app,
                      iframe: event.target.checked,
                    }))
                  }
                />
                <span>以 iframe 嵌入</span>
              </label>
            </div>
            <label className="field">
              <span>菜单描述 (可选)</span>
              <textarea
                value={selected.menu?.name ? selected.menu.name : ''}
                onChange={(event) => {
                  const value = event.target.value;
                  commit((app) => ({
                    ...app,
                    menu: value
                      ? {
                          ...(app.menu ?? ({ id: createId(), type: 'item', visible: true } as MenuItem)),
                          name: value,
                        }
                      : undefined,
                  }));
                }}
                rows={2}
                placeholder="配置关联的菜单名称"
              />
            </label>
          </form>
        ) : (
          <div className="microapps-placeholder">选择一个微应用开始编辑。</div>
        )}
      </div>
    </section>
  );
};
