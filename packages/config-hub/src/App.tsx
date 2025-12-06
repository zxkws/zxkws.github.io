import { useEffect, useState } from 'react';
import { fetchConfig, saveConfig } from './services/configApi';
import './App.css';

const App = () => {
  const [jsonText, setJsonText] = useState<string>('{}');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchConfig();
        setJsonText(JSON.stringify(data, null, 2));
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载配置失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
      if (parsed === null || typeof parsed !== 'object') {
        throw new Error('配置必须是一个 JSON 对象');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'JSON 解析失败');
      return;
    }

    setSaving(true);
    try {
      await saveConfig(parsed as Record<string, unknown>);
      setToast('保存成功');
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-shell app-root">
      <div className="toolbar">
        <div className="toolbar-left">
          <h2>微应用配置中心</h2>
          {error && <span className="error">{error}</span>}
        </div>
        <div className="toolbar-right">
          <button onClick={handleSave} disabled={saving || loading}>
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>

      <div className="workspace workspace-single">
        {loading ? (
          <div className="workspace-empty">加载配置中...</div>
        ) : (
          <textarea
            className="json-editor"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
          />
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

export default App;
