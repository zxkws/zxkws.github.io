import { message } from 'antd';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  type ConfigApplication,
  type ConfigRelease,
  type ConfigVersion,
  type ConfigVisibility,
  configCenterService,
} from '../../services/configCenterService';
import '../studio.css';

const emptyApplication = {
  key: '',
  environment: 'production',
  name: '',
  description: '',
  visibility: 'token' as ConfigVisibility,
};

const emptyVersion = {
  payload: '{\n  \n}',
  changelog: '',
};

const jsonText = (value: Record<string, unknown>) => JSON.stringify(value, null, 2);

export default function ConfigCenter() {
  const [applications, setApplications] = useState<ConfigApplication[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [versions, setVersions] = useState<ConfigVersion[]>([]);
  const [releases, setReleases] = useState<ConfigRelease[]>([]);
  const [applicationDraft, setApplicationDraft] = useState(emptyApplication);
  const [applicationEdit, setApplicationEdit] = useState({
    name: '',
    description: '',
    visibility: 'token' as ConfigVisibility,
  });
  const [versionDraft, setVersionDraft] = useState(emptyVersion);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [pullToken, setPullToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => applications.find((application) => application.id === selectedId) || null,
    [applications, selectedId],
  );

  const loadApplications = async (keepSelection = true) => {
    setLoading(true);
    try {
      const rows = await configCenterService.listApplications();
      setApplications(rows);
      setSelectedId((current) => {
        if (keepSelection && current && rows.some((row) => row.id === current)) return current;
        return rows[0]?.id || null;
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '配置应用加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadSelected = async (applicationId: string) => {
    setLoading(true);
    try {
      const [versionRows, releaseRows] = await Promise.all([
        configCenterService.listVersions(applicationId),
        configCenterService.listReleases(applicationId),
      ]);
      setVersions(versionRows);
      setReleases(releaseRows);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '配置版本加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = '配置中心 · 光域';
    loadApplications(false);
  }, []);

  useEffect(() => {
    setVersions([]);
    setReleases([]);
    setVersionDraft(emptyVersion);
    setEditingVersionId(null);
    setPullToken(null);
    if (selectedId) loadSelected(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!selected) return;
    setApplicationEdit({
      name: selected.name,
      description: selected.description || '',
      visibility: selected.visibility,
    });
  }, [selected]);

  const createApplication = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await configCenterService.createApplication(applicationDraft);
      setPullToken(created.pullToken || null);
      setApplicationDraft(emptyApplication);
      await loadApplications(false);
      setSelectedId(created.id);
      message.success('配置应用已创建');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '配置应用创建失败');
    } finally {
      setSaving(false);
    }
  };

  const parsePayload = () => {
    const value = JSON.parse(versionDraft.payload) as unknown;
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      throw new Error('配置必须是 JSON 对象');
    }
    return value as Record<string, unknown>;
  };

  const saveVersion = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedId) return;
    setSaving(true);
    try {
      const payload = parsePayload();
      if (editingVersionId) {
        await configCenterService.updateVersion(editingVersionId, {
          payload,
          changelog: versionDraft.changelog,
        });
        message.success('草稿版本已更新');
      } else {
        await configCenterService.createVersion(selectedId, {
          payload,
          changelog: versionDraft.changelog,
        });
        message.success('草稿版本已创建');
      }
      setEditingVersionId(null);
      setVersionDraft(emptyVersion);
      await loadSelected(selectedId);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '配置版本保存失败');
    } finally {
      setSaving(false);
    }
  };

  const editVersion = (version: ConfigVersion) => {
    setEditingVersionId(version.id);
    setVersionDraft({
      payload: jsonText(version.payload),
      changelog: version.changelog || '',
    });
  };

  const releaseVersion = async (version: ConfigVersion, action: 'publish' | 'rollback') => {
    if (!selectedId) return;
    const prompt =
      action === 'publish'
        ? `确认发布 v${version.version}？发布后内容不可修改。`
        : `确认把当前配置回滚到 v${version.version}？`;
    if (!window.confirm(prompt)) return;
    try {
      if (action === 'publish') await configCenterService.publishVersion(version.id);
      else await configCenterService.rollbackVersion(version.id);
      await Promise.all([loadSelected(selectedId), loadApplications()]);
      message.success(action === 'publish' ? '版本已发布' : '配置已回滚');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '版本操作失败');
    }
  };

  const deleteVersion = async (version: ConfigVersion) => {
    if (!selectedId || !window.confirm(`确定删除草稿 v${version.version}？`)) return;
    try {
      await configCenterService.deleteVersion(version.id);
      if (editingVersionId === version.id) {
        setEditingVersionId(null);
        setVersionDraft(emptyVersion);
      }
      await loadSelected(selectedId);
      message.success('草稿已删除');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '草稿删除失败');
    }
  };

  const rotateToken = async () => {
    if (!selected || !window.confirm('旧令牌会立即失效，确定轮换拉取令牌？')) return;
    try {
      const result = await configCenterService.rotateToken(selected.id);
      setPullToken(result.pullToken);
      message.success('令牌已轮换，请立即保存新令牌');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '令牌轮换失败');
    }
  };

  const deleteApplication = async () => {
    if (!selected || !window.confirm(`确定删除配置应用“${selected.name}”？仅未发布应用可删除。`)) return;
    try {
      await configCenterService.deleteApplication(selected.id);
      setPullToken(null);
      await loadApplications(false);
      message.success('配置应用已删除');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '配置应用删除失败');
    }
  };

  const updateApplication = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const result = await configCenterService.updateApplication(selected.id, applicationEdit);
      if (result.pullToken) setPullToken(result.pullToken);
      await loadApplications();
      message.success('配置应用设置已更新');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '配置应用更新失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="workspace-page">
      <header className="workspace-page__header">
        <div>
          <p className="workspace-page__eyebrow">Configuration delivery</p>
          <h1>配置中心</h1>
          <p className="workspace-page__description">
            维护 JSON 草稿、发布不可变版本、回滚历史版本，并通过带校验值的拉取接口向其他项目交付配置。
          </p>
        </div>
        <button type="button" className="workspace-button" onClick={() => loadApplications()} disabled={loading}>
          刷新
        </button>
      </header>

      {pullToken && (
        <div className="workspace-feedback workspace-feedback--warning">
          <strong>拉取令牌只展示这一次：</strong>
          <code className="studio-secret">{pullToken}</code>
          <button type="button" className="workspace-button" onClick={() => navigator.clipboard.writeText(pullToken)}>
            复制
          </button>
          <button type="button" className="workspace-button" onClick={() => setPullToken(null)}>
            已保存
          </button>
        </div>
      )}

      <div className="studio-shell">
        <aside className="workspace-panel studio-sidebar">
          <div className="workspace-panel__header">
            <div>
              <h2>配置应用</h2>
              <p className="workspace-panel__meta">{applications.length} 个应用</p>
            </div>
          </div>
          <div className="studio-list">
            {applications.map((application) => (
              <button
                type="button"
                className="studio-list__item"
                data-active={application.id === selectedId}
                key={application.id}
                onClick={() => setSelectedId(application.id)}
              >
                <strong>{application.name}</strong>
                <span>
                  {application.key} · {application.environment}
                </span>
                <span>publishedVersion: {application.publishedVersion}</span>
              </button>
            ))}
            {!loading && !applications.length && <p className="studio-empty">暂无配置应用</p>}
          </div>
          <form className="workspace-form studio-create-form" onSubmit={createApplication}>
            <h2>新建应用</h2>
            <label className="workspace-field">
              名称
              <input
                className="workspace-input"
                value={applicationDraft.name}
                onChange={(event) => setApplicationDraft({ ...applicationDraft, name: event.target.value })}
                required
              />
            </label>
            <label className="workspace-field">
              key
              <input
                className="workspace-input workspace-input--mono"
                value={applicationDraft.key}
                onChange={(event) => setApplicationDraft({ ...applicationDraft, key: event.target.value })}
                placeholder="main-app"
                required
              />
            </label>
            <label className="workspace-field">
              environment
              <input
                className="workspace-input workspace-input--mono"
                value={applicationDraft.environment}
                onChange={(event) => setApplicationDraft({ ...applicationDraft, environment: event.target.value })}
                required
              />
            </label>
            <label className="workspace-field">
              可见性
              <select
                className="workspace-input"
                value={applicationDraft.visibility}
                onChange={(event) =>
                  setApplicationDraft({
                    ...applicationDraft,
                    visibility: event.target.value as ConfigVisibility,
                  })
                }
              >
                <option value="token">token</option>
                <option value="public">public</option>
              </select>
            </label>
            <label className="workspace-field">
              描述
              <textarea
                className="workspace-textarea"
                value={applicationDraft.description}
                onChange={(event) => setApplicationDraft({ ...applicationDraft, description: event.target.value })}
              />
            </label>
            <button type="submit" className="workspace-button workspace-button--primary" disabled={saving}>
              创建应用
            </button>
          </form>
        </aside>

        <main className="studio-main">
          {!selected ? (
            <section className="workspace-panel studio-empty">选择或创建配置应用后开始维护版本。</section>
          ) : (
            <>
              <section className="workspace-panel">
                <div className="workspace-panel__header">
                  <div>
                    <h2>{selected.name}</h2>
                    <p className="workspace-panel__meta">{selected.description}</p>
                  </div>
                  <div className="workspace-inline-actions">
                    {selected.visibility === 'token' && (
                      <button type="button" className="workspace-button" onClick={rotateToken}>
                        轮换令牌
                      </button>
                    )}
                    <button
                      type="button"
                      className="workspace-button workspace-button--danger"
                      onClick={deleteApplication}
                    >
                      删除应用
                    </button>
                  </div>
                </div>
                <dl className="workspace-data-list">
                  <div>
                    <dt>pull endpoint</dt>
                    <dd className="workspace-code">
                      /api/v1/configs/{selected.key}?environment={selected.environment}
                    </dd>
                  </div>
                  <div>
                    <dt>visibility</dt>
                    <dd>{selected.visibility}</dd>
                  </div>
                  <div>
                    <dt>publishedVersion</dt>
                    <dd>{selected.publishedVersion}</dd>
                  </div>
                  <div>
                    <dt>updatedAt</dt>
                    <dd>{selected.updatedAt}</dd>
                  </div>
                </dl>
                <form className="studio-app-settings" onSubmit={updateApplication}>
                  <label className="workspace-field">
                    名称
                    <input
                      className="workspace-input"
                      value={applicationEdit.name}
                      onChange={(event) => setApplicationEdit({ ...applicationEdit, name: event.target.value })}
                      required
                    />
                  </label>
                  <label className="workspace-field">
                    可见性
                    <select
                      className="workspace-input"
                      value={applicationEdit.visibility}
                      onChange={(event) =>
                        setApplicationEdit({
                          ...applicationEdit,
                          visibility: event.target.value as ConfigVisibility,
                        })
                      }
                    >
                      <option value="token">token</option>
                      <option value="public">public</option>
                    </select>
                  </label>
                  <label className="workspace-field studio-app-settings__description">
                    描述
                    <input
                      className="workspace-input"
                      value={applicationEdit.description}
                      onChange={(event) => setApplicationEdit({ ...applicationEdit, description: event.target.value })}
                    />
                  </label>
                  <button type="submit" className="workspace-button" disabled={saving}>
                    保存应用设置
                  </button>
                </form>
              </section>

              <section className="workspace-panel">
                <div className="workspace-panel__header">
                  <div>
                    <h2>{editingVersionId ? '编辑草稿' : '创建新版本'}</h2>
                    <p className="workspace-panel__meta">只接受 JSON 对象；发布后该版本不可再编辑。</p>
                  </div>
                  {editingVersionId && (
                    <button
                      type="button"
                      className="workspace-button"
                      onClick={() => {
                        setEditingVersionId(null);
                        setVersionDraft(emptyVersion);
                      }}
                    >
                      取消编辑
                    </button>
                  )}
                </div>
                <form className="workspace-form studio-wide-form" onSubmit={saveVersion}>
                  <label className="workspace-field">
                    JSON 配置
                    <textarea
                      className="workspace-textarea workspace-input--mono studio-json-editor"
                      value={versionDraft.payload}
                      onChange={(event) => setVersionDraft({ ...versionDraft, payload: event.target.value })}
                      spellCheck={false}
                      required
                    />
                  </label>
                  <label className="workspace-field">
                    变更说明
                    <input
                      className="workspace-input"
                      value={versionDraft.changelog}
                      onChange={(event) => setVersionDraft({ ...versionDraft, changelog: event.target.value })}
                    />
                  </label>
                  <button type="submit" className="workspace-button workspace-button--primary" disabled={saving}>
                    {editingVersionId ? '保存草稿' : '创建草稿版本'}
                  </button>
                </form>
              </section>

              <section className="workspace-panel workspace-panel--flush">
                <div className="studio-table-heading">
                  <h2>版本</h2>
                </div>
                <div className="workspace-table-wrap">
                  <table className="workspace-table">
                    <thead>
                      <tr>
                        <th>version</th>
                        <th>status</th>
                        <th>checksum</th>
                        <th>changelog</th>
                        <th>publishedAt</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {versions.map((version) => (
                        <tr key={version.id}>
                          <td className="workspace-table__primary">v{version.version}</td>
                          <td>{version.status}</td>
                          <td className="workspace-code">{version.checksum}</td>
                          <td>{version.changelog}</td>
                          <td>{version.publishedAt}</td>
                          <td>
                            <div className="workspace-inline-actions">
                              {version.status === 'draft' ? (
                                <>
                                  <button
                                    type="button"
                                    className="workspace-button"
                                    onClick={() => editVersion(version)}
                                  >
                                    编辑
                                  </button>
                                  <button
                                    type="button"
                                    className="workspace-button workspace-button--primary"
                                    onClick={() => releaseVersion(version, 'publish')}
                                  >
                                    发布
                                  </button>
                                  <button
                                    type="button"
                                    className="workspace-button workspace-button--danger"
                                    onClick={() => deleteVersion(version)}
                                  >
                                    删除
                                  </button>
                                </>
                              ) : (
                                version.id !== selected.publishedVersionId && (
                                  <button
                                    type="button"
                                    className="workspace-button"
                                    onClick={() => releaseVersion(version, 'rollback')}
                                  >
                                    回滚至此版本
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!versions.length && (
                        <tr>
                          <td colSpan={6} className="workspace-empty">
                            暂无版本
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="workspace-panel workspace-panel--flush">
                <div className="studio-table-heading">
                  <h2>发布记录</h2>
                </div>
                <div className="workspace-table-wrap">
                  <table className="workspace-table">
                    <thead>
                      <tr>
                        <th>version</th>
                        <th>action</th>
                        <th>createdBy</th>
                        <th>createdAt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {releases.map((release) => (
                        <tr key={release.id}>
                          <td>v{release.version}</td>
                          <td>{release.action}</td>
                          <td>{release.createdBy}</td>
                          <td>{release.createdAt}</td>
                        </tr>
                      ))}
                      {!releases.length && (
                        <tr>
                          <td colSpan={4} className="workspace-empty">
                            暂无发布记录
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
