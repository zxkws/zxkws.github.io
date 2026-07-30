import { FormEvent, useEffect, useState } from 'react';
import type { WorkspaceBootstrap, WorkspaceSettings } from '../domain';
import { useAgentWorkspaceClient, useWorkspaceSearch } from '../data/context';
import {
  ActionNotice,
  EmptyState,
  EntityLink,
  ErrorState,
  KeyValue,
  LoadingState,
  PageHeader,
  Status,
} from '../components/Primitives';
import { createMutationId } from '../components/mutations';
import { CursorPager } from '../components/CursorPager';

export function SearchPage({ snapshot }: { snapshot: WorkspaceBootstrap }) {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();
  const searchQuery = useWorkspaceSearch(submittedQuery, { cursor, limit: 50 });
  const results = searchQuery.data?.items ?? [];

  const search = (event: FormEvent) => {
    event.preventDefault();
    setCursor(undefined);
    setSubmittedQuery(query);
  };

  return (
    <section className="aw-page">
      <PageHeader
        title="Search"
        subtitle="Project、Message、Task、Run、ChangeSet、Delivery、Agent、Memory、Repository"
      />
      <form className="aw-toolbar" onSubmit={search}>
        <label className="aw-field aw-field--grow">
          <span>query</span>
          <input
            className="aw-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
        </label>
        <button className="aw-button aw-button--primary" disabled={searchQuery.isFetching || !query.trim()}>
          {searchQuery.isFetching ? '搜索中…' : '搜索'}
        </button>
      </form>
      {!submittedQuery ? null : searchQuery.isPending ? (
        <LoadingState />
      ) : searchQuery.isError ? (
        <ErrorState error={searchQuery.error} retry={() => void searchQuery.refetch()} />
      ) : results.length === 0 ? (
        <EmptyState title="没有匹配结果" />
      ) : (
        <div className="aw-search-results">
          {results.map((result) => (
            <article className="aw-search-result" key={result.id}>
              <div className="aw-card-header">
                <span className="aw-badge">{result.entityType}</span>
                {result.rawStatus !== null && <Status value={result.rawStatus} />}
              </div>
              <h2>
                <EntityLink
                  snapshot={snapshot}
                  entityType={result.entityType}
                  entityId={result.entityId}
                  projectId={result.projectId}
                >
                  {result.title}
                </EntityLink>
              </h2>
              <p>{result.snippet}</p>
              <span className="aw-meta">{result.entityId}</span>
            </article>
          ))}
        </div>
      )}
      {searchQuery.data && <CursorPager page={searchQuery.data} onCursor={setCursor} />}
    </section>
  );
}

export function SettingsPage({ snapshot }: { snapshot: WorkspaceBootstrap }) {
  const client = useAgentWorkspaceClient();
  const [form, setForm] = useState<WorkspaceSettings>(snapshot.settings);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(snapshot.settings), [snapshot.settings]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const { version: _version, ...settings } = form; // eslint-disable-line @typescript-eslint/no-unused-vars
      await client.updateSettings({
        ...settings,
        expectedVersion: form.version,
        clientMutationId: createMutationId(),
      });
      setNotice('保存成功');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="aw-page">
      <PageHeader title="Settings" subtitle={`version: ${snapshot.settings.version}`} />
      <ActionNotice message={notice} />
      {form.ownerMode === 'host_owner' && (
        <div className="aw-banner aw-banner--danger" role="alert">
          host_owner 继承当前 macOS 用户权限，没有强目录隔离。
        </div>
      )}
      <form className="aw-settings-section" onSubmit={save}>
        <h2>Workspace</h2>
        <KeyValue
          entries={[
            { label: 'version', value: form.version },
            { label: 'eventCursor', value: snapshot.eventCursor },
            { label: 'generatedAt', value: snapshot.generatedAt },
          ]}
        />
        <label className="aw-field">
          <span>defaultProjectId</span>
          <select
            className="aw-select"
            value={form.defaultProjectId ?? ''}
            onChange={(event) => setForm((current) => ({ ...current, defaultProjectId: event.target.value || null }))}
          >
            <option value="">null</option>
            {snapshot.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} · {project.id}
              </option>
            ))}
          </select>
        </label>
        <label className="aw-field">
          <span>ownerMode</span>
          <select
            className="aw-select"
            value={form.ownerMode}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                ownerMode: event.target.value as WorkspaceSettings['ownerMode'],
              }))
            }
          >
            <option>project_owner</option>
            <option>host_owner</option>
          </select>
        </label>
        <label className="aw-field">
          <span>maxConcurrentRuns</span>
          <input
            className="aw-input"
            type="number"
            value={form.maxConcurrentRuns}
            onChange={(event) => setForm((current) => ({ ...current, maxConcurrentRuns: event.target.valueAsNumber }))}
          />
        </label>
        <label className="aw-field">
          <span>maxAgentHandoffDepth</span>
          <input
            className="aw-input"
            type="number"
            value={form.maxAgentHandoffDepth}
            onChange={(event) =>
              setForm((current) => ({ ...current, maxAgentHandoffDepth: event.target.valueAsNumber }))
            }
          />
        </label>
        <label className="aw-field aw-field--inline">
          <input
            type="checkbox"
            checked={form.notificationMuted}
            onChange={(event) => setForm((current) => ({ ...current, notificationMuted: event.target.checked }))}
          />
          <span>notificationMuted</span>
        </label>
        <fieldset className="aw-field">
          <legend>quietHours</legend>
          <label className="aw-field aw-field--inline">
            <input
              type="checkbox"
              checked={form.quietHours !== null}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  quietHours: event.target.checked
                    ? (current.quietHours ?? { timezone: '', start: '', end: '' })
                    : null,
                }))
              }
            />
            <span>enabled</span>
          </label>
          {form.quietHours !== null && (
            <>
              <label className="aw-field">
                <span>timezone</span>
                <input
                  className="aw-input"
                  value={form.quietHours.timezone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      quietHours: current.quietHours ? { ...current.quietHours, timezone: event.target.value } : null,
                    }))
                  }
                />
              </label>
              <label className="aw-field">
                <span>start</span>
                <input
                  className="aw-input"
                  value={form.quietHours.start}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      quietHours: current.quietHours ? { ...current.quietHours, start: event.target.value } : null,
                    }))
                  }
                />
              </label>
              <label className="aw-field">
                <span>end</span>
                <input
                  className="aw-input"
                  value={form.quietHours.end}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      quietHours: current.quietHours ? { ...current.quietHours, end: event.target.value } : null,
                    }))
                  }
                />
              </label>
            </>
          )}
        </fieldset>
        <button className="aw-button aw-button--primary" disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      </form>
    </section>
  );
}
