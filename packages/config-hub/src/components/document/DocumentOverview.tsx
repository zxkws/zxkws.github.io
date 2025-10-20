import { ConfigDocument, SystemConfigDoc } from '../../types';
import './DocumentOverview.css';

type OverviewProps = {
  document: ConfigDocument;
  onUpdate: (_updater: (_doc: SystemConfigDoc) => SystemConfigDoc) => void;
};

export const DocumentOverview = ({ document, onUpdate }: OverviewProps) => {
  const { name, description, createdAt, updatedAt, data } = document;
  const version = data.version;
  const metadata = data.metadata || {};

  const handleVersionChange = (nextVersion: string) => {
    onUpdate((doc) => ({
      ...doc,
      version: nextVersion,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleMetadataChange = (key: string, value: string) => {
    onUpdate((doc) => ({
      ...doc,
      metadata: {
        ...(doc.metadata ?? {}),
        [key]: value,
      },
    }));
  };

  const entries = Object.entries(metadata);

  return (
    <section className="document-overview">
      <div>
        <h2>{name}</h2>
        <p>{description || '未添加描述说明。'}</p>
      </div>
      <div className="document-grid">
        <label>
          <span>版本号</span>
          <input value={version} onChange={(event) => handleVersionChange(event.target.value)} placeholder="1.0.0" />
        </label>
        <label>
          <span>最近更新</span>
          <input value={new Date(updatedAt).toLocaleString()} disabled />
        </label>
        <label>
          <span>创建时间</span>
          <input value={new Date(createdAt).toLocaleString()} disabled />
        </label>
      </div>
      <div className="document-meta">
        <h3>元数据</h3>
        {entries.length === 0 && <p className="document-meta-empty">尚未记录任何元数据。</p>}
        {entries.map(([key, value]) => (
          <label key={key}>
            <span>{key}</span>
            <input value={String(value)} onChange={(event) => handleMetadataChange(key, event.target.value)} />
          </label>
        ))}
        <div className="document-meta-add">
          <button
            onClick={() => {
              const key = window.prompt('元数据键');
              if (!key) return;
              const value = window.prompt('元数据值', '');
              if (value === null) return;
              handleMetadataChange(key, value);
            }}
          >
            添加元数据
          </button>
        </div>
      </div>
    </section>
  );
};
