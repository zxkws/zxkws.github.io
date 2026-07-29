import { message } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type AgentGitHubBranch,
  type AgentGitHubCapabilities,
  type AgentGitHubConnection,
  type AgentGitHubDeviceSession,
  type AgentGitHubPullRequest,
  type AgentGitHubRepository,
  agentPlatformService,
} from '../../services/agentPlatformService';

type GitHubWorkspacePanelProps = {
  repository: string;
  baseRef: string;
  targetBranch: string;
  onRepositoryChange: (value: string) => void;
  onBaseRefChange: (value: string) => void;
  onTargetBranchChange: (value: string) => void;
};

const errorStatus = (error: unknown) =>
  error && typeof error === 'object' && typeof (error as { status?: unknown }).status === 'number'
    ? (error as { status: number }).status
    : null;

const repositoryUrl = (repository: AgentGitHubRepository) =>
  repository.htmlUrl || `https://github.com/${repository.fullName}`;

const githubDeviceSessionStorageKey = 'lightspace.github-device-session.v1';

const readStoredDeviceSession = (): AgentGitHubDeviceSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(githubDeviceSessionStorageKey);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<AgentGitHubDeviceSession>;
    const verificationUri = new URL(value.verificationUri || '');
    if (
      value.status !== 'pending' ||
      typeof value.userCode !== 'string' ||
      typeof value.pollToken !== 'string' ||
      typeof value.expiresAt !== 'string' ||
      typeof value.nextPollAt !== 'string' ||
      typeof value.interval !== 'number' ||
      value.interval < 1 ||
      Date.parse(value.expiresAt) <= Date.now() ||
      verificationUri.protocol !== 'https:' ||
      verificationUri.hostname !== 'github.com'
    ) {
      window.sessionStorage.removeItem(githubDeviceSessionStorageKey);
      return null;
    }
    return value as AgentGitHubDeviceSession;
  } catch {
    try {
      window.sessionStorage.removeItem(githubDeviceSessionStorageKey);
    } catch {
      // The browser may block storage; the in-memory authorization flow still works.
    }
    return null;
  }
};

export default function GitHubWorkspacePanel({
  repository,
  baseRef,
  targetBranch,
  onRepositoryChange,
  onBaseRefChange,
  onTargetBranchChange,
}: GitHubWorkspacePanelProps) {
  const [connection, setConnection] = useState<AgentGitHubConnection | null>(null);
  const [capabilities, setCapabilities] = useState<AgentGitHubCapabilities | null>(null);
  const [deviceSession, setDeviceSession] = useState<AgentGitHubDeviceSession | null>(readStoredDeviceSession);
  const [devicePollStatus, setDevicePollStatus] = useState('');
  const [repositories, setRepositories] = useState<AgentGitHubRepository[]>([]);
  const [nextRepositoryPage, setNextRepositoryPage] = useState<number | null>(null);
  const [branches, setBranches] = useState<AgentGitHubBranch[]>([]);
  const [pullRequests, setPullRequests] = useState<AgentGitHubPullRequest[]>([]);
  const [query, setQuery] = useState('');
  const [pullRequestDraft, setPullRequestDraft] = useState({
    title: '',
    body: '',
    draft: false,
  });
  const [comparison, setComparison] = useState<Record<string, unknown> | null>(null);
  const [commitChecks, setCommitChecks] = useState<Record<string, unknown> | null>(null);
  const [inspectingBranch, setInspectingBranch] = useState(false);
  const [creatingPullRequest, setCreatingPullRequest] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [capabilityAvailable, setCapabilityAvailable] = useState(true);
  const [repositoryContextRevision, setRepositoryContextRevision] = useState(0);
  const connectionRequestRef = useRef(0);

  const selectedRepository = repositories.find((item) => repositoryUrl(item) === repository) || null;
  const filteredRepositories = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return repositories;
    return repositories.filter((item) => item.fullName.toLowerCase().includes(keyword));
  }, [query, repositories]);

  const loadRepositories = async () => {
    const response = await agentPlatformService.listGitHubRepositories();
    setRepositories(response.items);
    setNextRepositoryPage(response.pagination.nextPage);
    setRepositoryContextRevision((current) => current + 1);
  };

  const loadConnection = async () => {
    const requestId = connectionRequestRef.current + 1;
    connectionRequestRef.current = requestId;
    setLoading(true);
    try {
      try {
        const result = await agentPlatformService.getGitHubCapabilities();
        if (connectionRequestRef.current === requestId) setCapabilities(result);
      } catch (error) {
        if (connectionRequestRef.current !== requestId) return;
        if (errorStatus(error) !== 404) {
          message.error(error instanceof Error ? error.message : 'GitHub 能力信息加载失败');
        }
        setCapabilities(null);
      }
      const result = await agentPlatformService.getGitHubConnection();
      if (connectionRequestRef.current !== requestId) return;
      setCapabilityAvailable(true);
      setConnection(result);
      if (result.connected) {
        setDeviceSession(null);
        setDevicePollStatus('');
        await loadRepositories();
      } else {
        setRepositories([]);
        setNextRepositoryPage(null);
        setBranches([]);
      }
    } catch (error) {
      if (connectionRequestRef.current !== requestId) return;
      if (errorStatus(error) === 404) {
        setCapabilityAvailable(false);
        setConnection(null);
        return;
      }
      message.error(error instanceof Error ? error.message : 'GitHub 连接状态加载失败');
    } finally {
      if (connectionRequestRef.current === requestId) setLoading(false);
    }
  };

  useEffect(() => {
    void loadConnection();
  }, []);

  useEffect(() => {
    try {
      if (deviceSession) {
        window.sessionStorage.setItem(githubDeviceSessionStorageKey, JSON.stringify(deviceSession));
      } else {
        window.sessionStorage.removeItem(githubDeviceSessionStorageKey);
      }
    } catch {
      // Session persistence is a refresh convenience; polling still works in memory.
    }
  }, [deviceSession]);

  useEffect(() => {
    if (!deviceSession) return;
    let stopped = false;
    const nextPollTime = Date.parse(deviceSession.nextPollAt);
    const delay = Math.max(
      500,
      Number.isFinite(nextPollTime) ? nextPollTime - Date.now() : deviceSession.interval * 1000,
    );
    const timer = window.setTimeout(async () => {
      try {
        const result = await agentPlatformService.pollGitHubDeviceFlow(deviceSession.pollToken);
        if (stopped) return;
        if (result.status === 'connected') {
          connectionRequestRef.current += 1;
          setLoading(false);
          setConnection(result.connection);
          setDeviceSession(null);
          setDevicePollStatus('connected');
          await loadRepositories();
          message.success('GitHub 设备授权已连接');
          return;
        }
        setDevicePollStatus(result.status);
        setDeviceSession((current) =>
          current
            ? {
                ...current,
                interval: result.interval,
                nextPollAt: result.nextPollAt,
                expiresAt: result.expiresAt,
                pollToken: result.pollToken,
              }
            : null,
        );
      } catch (error) {
        if (stopped) return;
        if (errorStatus(error) === 429) {
          setDeviceSession((current) =>
            current
              ? {
                  ...current,
                  nextPollAt: new Date(Date.now() + current.interval * 1000).toISOString(),
                }
              : null,
          );
          return;
        }
        setDeviceSession(null);
        setDevicePollStatus('');
        message.error(error instanceof Error ? error.message : 'GitHub 设备授权失败');
      }
    }, delay);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [deviceSession]);

  useEffect(() => {
    const owner = selectedRepository?.owner;
    if (!owner) {
      setBranches([]);
      setPullRequests([]);
      setComparison(null);
      setCommitChecks(null);
      return;
    }
    let stopped = false;
    setComparison(null);
    setCommitChecks(null);
    const loadRepositoryContext = async () => {
      const [branchResult, pullRequestResult] = await Promise.allSettled([
        agentPlatformService.listGitHubBranches(owner.login, selectedRepository.name),
        agentPlatformService.listGitHubPullRequests(owner.login, selectedRepository.name),
      ]);
      if (stopped) return;
      if (branchResult.status === 'fulfilled') {
        setBranches(branchResult.value.items);
      } else {
        message.error(branchResult.reason instanceof Error ? branchResult.reason.message : 'GitHub 分支加载失败');
      }
      if (pullRequestResult.status === 'fulfilled') {
        setPullRequests(pullRequestResult.value.items);
      } else {
        message.error(
          pullRequestResult.reason instanceof Error ? pullRequestResult.reason.message : 'GitHub Pull Request 加载失败',
        );
      }
    };
    void loadRepositoryContext();
    return () => {
      stopped = true;
    };
  }, [selectedRepository?.id, repositoryContextRevision]);

  const authorize = async () => {
    try {
      const redirect = window.location.href;
      const result = await agentPlatformService.startGitHubOAuth(redirect);
      const authorizationUrl = new URL(result.authorizationUrl);
      if (authorizationUrl.protocol !== 'https:' || authorizationUrl.hostname !== 'github.com') {
        throw new Error('GitHub 授权地址无效');
      }
      window.location.assign(authorizationUrl.href);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'GitHub 授权启动失败');
    }
  };

  const authorizeWithDevice = async () => {
    setAuthorizing(true);
    try {
      const result = await agentPlatformService.startGitHubDeviceFlow();
      const verificationUri = new URL(result.verificationUri);
      if (verificationUri.protocol !== 'https:' || verificationUri.hostname !== 'github.com') {
        throw new Error('GitHub 设备授权地址无效');
      }
      setDeviceSession(result);
      setDevicePollStatus(result.status);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'GitHub 设备授权启动失败');
    } finally {
      setAuthorizing(false);
    }
  };

  const cancelDeviceAuthorization = async () => {
    const pollToken = deviceSession?.pollToken;
    if (!pollToken) return;
    try {
      await agentPlatformService.cancelGitHubDeviceFlow(pollToken);
      message.success('设备授权已取消');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '设备授权取消失败');
    } finally {
      setDeviceSession(null);
      setDevicePollStatus('');
    }
  };

  const copyDeviceCode = async () => {
    if (!deviceSession) return;
    try {
      await navigator.clipboard.writeText(deviceSession.userCode);
      message.success('设备码已复制');
    } catch {
      message.error('设备码复制失败，请手动复制');
    }
  };

  const loadMoreRepositories = async () => {
    if (!nextRepositoryPage) return;
    setLoading(true);
    try {
      const response = await agentPlatformService.listGitHubRepositories(nextRepositoryPage);
      setRepositories((current) => [
        ...new Map([...current, ...response.items].map((item) => [item.id, item])).values(),
      ]);
      setNextRepositoryPage(response.pagination.nextPage);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'GitHub 仓库加载失败');
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm('确认断开当前 GitHub 授权？正在执行的任务不会自动恢复。')) return;
    try {
      await agentPlatformService.disconnectGitHub();
      await loadConnection();
      message.success('GitHub 授权已断开');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'GitHub 授权断开失败');
    }
  };

  const selectRepository = (htmlUrl: string) => {
    const selected = repositories.find((item) => repositoryUrl(item) === htmlUrl);
    onRepositoryChange(htmlUrl);
    if (selected) onBaseRefChange(selected.defaultBranch || '');
  };

  const createPullRequest = async () => {
    if (!selectedRepository?.owner || !baseRef.trim() || !targetBranch.trim()) {
      message.warning('请选择仓库并填写基准分支和任务分支');
      return;
    }
    if (!pullRequestDraft.title.trim()) {
      message.warning('请填写 Pull Request 标题');
      return;
    }
    const headBranch = branches.find((branch) => branch.name === targetBranch.trim());
    if (!headBranch) {
      message.warning('任务分支尚未出现在 GitHub，请先由 Agent 推送分支并刷新仓库');
      return;
    }
    setCreatingPullRequest(true);
    try {
      const result = await agentPlatformService.createGitHubPullRequest(
        selectedRepository.owner.login,
        selectedRepository.name,
        {
          title: pullRequestDraft.title.trim(),
          head: targetBranch.trim(),
          branch: targetBranch.trim(),
          expectedHeadSha: headBranch.commit.sha,
          base: baseRef.trim(),
          body: pullRequestDraft.body.trim() || undefined,
          draft: pullRequestDraft.draft,
        },
      );
      setPullRequests((current) => [result, ...current.filter((item) => item.id !== result.id)]);
      setPullRequestDraft({ title: '', body: '', draft: false });
      message.success('Pull Request 已创建');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Pull Request 创建失败');
    } finally {
      setCreatingPullRequest(false);
    }
  };

  const inspectTargetBranch = async () => {
    if (!selectedRepository?.owner || !baseRef.trim() || !targetBranch.trim()) {
      message.warning('请选择仓库并填写基准分支和任务分支');
      return;
    }
    const headBranch = branches.find((branch) => branch.name === targetBranch.trim());
    if (!headBranch) {
      message.warning('任务分支尚未出现在 GitHub，请先由 Agent 推送分支并刷新仓库');
      return;
    }
    setInspectingBranch(true);
    try {
      const [comparisonResult, checksResult] = await Promise.all([
        agentPlatformService.compareGitHubRefs(
          selectedRepository.owner.login,
          selectedRepository.name,
          baseRef.trim(),
          targetBranch.trim(),
        ),
        agentPlatformService.getGitHubCommitChecks(
          selectedRepository.owner.login,
          selectedRepository.name,
          headBranch.commit.sha,
        ),
      ]);
      setComparison(comparisonResult);
      setCommitChecks(checksResult);
      message.success('任务分支变更与 Checks 已加载');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '任务分支验证信息加载失败');
    } finally {
      setInspectingBranch(false);
    }
  };

  return (
    <fieldset className="rbac-fieldset agent-github-panel">
      <legend>GitHub 工作区</legend>
      <p className="workspace-panel__meta">
        GitHub 任务会自动进入 Elderberry 隔离 Runner；每个任务使用独立临时容器，提交和 Pull Request
        仍需在任务审批节点确认。
      </p>
      <div className="workspace-panel__header">
        <div>
          <h3>授权与仓库</h3>
          {connection?.connected ? (
            <p className="workspace-panel__meta">
              connected: true · login: {connection.login} · scopes: {JSON.stringify(connection.scopes)} · missingScopes:{' '}
              {JSON.stringify(connection.missingScopes)}
            </p>
          ) : (
            <p className="workspace-panel__meta">
              connected: false
              {!capabilityAvailable ? ' · 当前后端尚未开放 GitHub 授权接口' : ''}
            </p>
          )}
        </div>
        <div className="workspace-inline-actions">
          <button type="button" className="workspace-button" disabled={loading} onClick={() => void loadConnection()}>
            刷新
          </button>
          {capabilityAvailable && !connection?.connected ? (
            <>
              {capabilities?.deviceFlowConfigured ? (
                <button
                  type="button"
                  className="workspace-button workspace-button--primary"
                  disabled={authorizing || Boolean(deviceSession)}
                  onClick={() => void authorizeWithDevice()}
                >
                  {authorizing ? '启动中…' : '使用设备码授权'}
                </button>
              ) : null}
              {capabilities === null || capabilities.webOAuthConfigured ? (
                <button
                  type="button"
                  className={`workspace-button${capabilities?.deviceFlowConfigured ? '' : ' workspace-button--primary'}`}
                  onClick={() => void authorize()}
                >
                  网页 OAuth 授权
                </button>
              ) : null}
            </>
          ) : null}
          {connection?.connected ? (
            <button
              type="button"
              className="workspace-button workspace-button--danger"
              onClick={() => void disconnect()}
            >
              断开授权
            </button>
          ) : null}
        </div>
      </div>
      {capabilities ? (
        <p className="workspace-panel__meta">
          deviceFlowConfigured: {String(capabilities.deviceFlowConfigured)} · webOAuthConfigured:{' '}
          {String(capabilities.webOAuthConfigured)} · requestedScopes: {JSON.stringify(capabilities.requestedScopes)}
        </p>
      ) : null}
      {deviceSession ? (
        <section className="agent-github-device">
          <div>
            <strong>在 GitHub 输入设备码</strong>
            <p>
              status: {devicePollStatus} · expiresAt: {deviceSession.expiresAt}
            </p>
          </div>
          <code>{deviceSession.userCode}</code>
          <div className="workspace-inline-actions">
            <button type="button" className="workspace-button" onClick={() => void copyDeviceCode()}>
              复制设备码
            </button>
            <a
              className="workspace-button workspace-button--primary"
              href={deviceSession.verificationUri}
              target="_blank"
              rel="noreferrer"
            >
              打开 GitHub 验证页
            </a>
            <button
              type="button"
              className="workspace-button workspace-button--danger"
              onClick={() => void cancelDeviceAuthorization()}
            >
              取消
            </button>
          </div>
        </section>
      ) : null}
      {capabilities &&
      !capabilities.deviceFlowConfigured &&
      !capabilities.webOAuthConfigured &&
      !connection?.connected ? (
        <p className="studio-empty">当前后端尚未配置 GitHub 设备授权或 Web OAuth。</p>
      ) : null}
      {connection?.connected ? (
        <>
          <label className="workspace-field">
            查询已授权仓库
            <input
              className="workspace-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="owner/repository"
            />
          </label>
          <label className="workspace-field">
            仓库
            <select
              className="workspace-input"
              value={selectedRepository ? repositoryUrl(selectedRepository) : ''}
              onChange={(event) => selectRepository(event.target.value)}
            >
              <option value="">请选择仓库</option>
              {filteredRepositories.map((item) => (
                <option key={item.id} value={repositoryUrl(item)}>
                  {item.fullName}
                </option>
              ))}
            </select>
          </label>
          {nextRepositoryPage ? (
            <button
              type="button"
              className="workspace-button"
              disabled={loading}
              onClick={() => void loadMoreRepositories()}
            >
              加载更多仓库
            </button>
          ) : null}
          {selectedRepository ? (
            <pre className="workspace-code studio-prewrap">{JSON.stringify(selectedRepository, null, 2)}</pre>
          ) : null}
        </>
      ) : null}
      <label className="workspace-field">
        GitHub 仓库 URL
        <input
          className="workspace-input workspace-input--mono"
          type="url"
          value={repository}
          onChange={(event) => onRepositoryChange(event.target.value)}
          placeholder="https://github.com/owner/repository"
          maxLength={2048}
        />
      </label>
      <div className="agent-task-columns">
        <div className="workspace-field">
          <label htmlFor="agent-github-base-ref">基准分支或 ref</label>
          {branches.length ? (
            <select
              id="agent-github-base-ref"
              className="workspace-input workspace-input--mono"
              value={baseRef}
              onChange={(event) => onBaseRefChange(event.target.value)}
            >
              <option value="">请选择分支</option>
              {branches.map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="agent-github-base-ref"
              className="workspace-input workspace-input--mono"
              value={baseRef}
              onChange={(event) => onBaseRefChange(event.target.value)}
              placeholder="main"
              maxLength={255}
            />
          )}
        </div>
        <label className="workspace-field">
          任务分支
          <input
            className="workspace-input workspace-input--mono"
            value={targetBranch}
            onChange={(event) => onTargetBranchChange(event.target.value)}
            placeholder="agent/feature-name"
            maxLength={80}
          />
        </label>
      </div>
      {selectedRepository ? (
        <details className="agent-github-pull-requests">
          <summary>Pull Requests · {pullRequests.length}</summary>
          <div className="agent-github-pull-requests__content">
            <button
              type="button"
              className="workspace-button"
              disabled={inspectingBranch}
              onClick={() => void inspectTargetBranch()}
            >
              {inspectingBranch ? '读取中…' : '查看任务分支变更与 Checks'}
            </button>
            {comparison ? (
              <pre className="workspace-code studio-prewrap">{JSON.stringify(comparison, null, 2)}</pre>
            ) : null}
            {commitChecks ? (
              <pre className="workspace-code studio-prewrap">{JSON.stringify(commitChecks, null, 2)}</pre>
            ) : null}
            <div className="agent-github-pull-requests__list">
              {pullRequests.map((pullRequest) => (
                <a
                  key={pullRequest.id}
                  href={pullRequest.htmlUrl || undefined}
                  target={pullRequest.htmlUrl ? '_blank' : undefined}
                  rel={pullRequest.htmlUrl ? 'noreferrer' : undefined}
                >
                  <strong>
                    #{pullRequest.number} {pullRequest.title}
                  </strong>
                  <span>
                    state: {pullRequest.state} · head: {pullRequest.head?.ref} · base: {pullRequest.base?.ref}
                  </span>
                </a>
              ))}
            </div>
            <label className="workspace-field">
              新 Pull Request 标题
              <input
                className="workspace-input"
                value={pullRequestDraft.title}
                onChange={(event) => setPullRequestDraft({ ...pullRequestDraft, title: event.target.value })}
                maxLength={256}
              />
            </label>
            <label className="workspace-field">
              正文（可选）
              <textarea
                className="workspace-textarea"
                value={pullRequestDraft.body}
                onChange={(event) => setPullRequestDraft({ ...pullRequestDraft, body: event.target.value })}
                maxLength={20_000}
              />
            </label>
            <label className="rbac-check">
              <input
                type="checkbox"
                checked={pullRequestDraft.draft}
                onChange={(event) => setPullRequestDraft({ ...pullRequestDraft, draft: event.target.checked })}
              />
              draft
            </label>
            <button
              type="button"
              className="workspace-button workspace-button--primary"
              disabled={creatingPullRequest}
              onClick={() => void createPullRequest()}
            >
              {creatingPullRequest ? '创建中…' : '创建 Pull Request'}
            </button>
          </div>
        </details>
      ) : null}
    </fieldset>
  );
}
