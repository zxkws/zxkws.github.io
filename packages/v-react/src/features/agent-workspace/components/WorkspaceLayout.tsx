import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { WorkspaceBootstrap, WorkspaceConnectionState } from '../domain';
import { Status } from './Primitives';
import { workspacePath } from './paths';

const globalItems = [
  { to: '/inbox', label: 'Inbox' },
  { to: '/projects', label: 'Projects' },
  { to: '/agents', label: 'Agents' },
  { to: '/computers', label: 'Computers' },
  { to: '/search', label: 'Search' },
  { to: '/settings', label: 'Settings' },
];

function NavigationItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      className={({ isActive }) => `aw-nav-item${isActive ? ' aw-nav-item--active' : ''}`}
      to={workspacePath(to)}
    >
      {label}
    </NavLink>
  );
}

export function WorkspaceLayout({
  snapshot,
  connectionState,
  children,
}: {
  snapshot: WorkspaceBootstrap;
  connectionState: WorkspaceConnectionState;
  children: ReactNode;
}) {
  const location = useLocation();
  const currentProjectId = location.pathname.match(/\/agent-workspace\/projects\/([^/]+)/)?.[1] ?? null;
  const currentProject = snapshot.projects.find((project) => project.id === currentProjectId);
  const onlineComputer = snapshot.computers.find((computer) => computer.status === 'online');

  return (
    <div className="aw-workspace">
      <div className="aw-shell">
        <aside className="aw-sidebar" aria-label="工作空间导航">
          <NavLink className="aw-brand" to={workspacePath('/inbox')}>
            <span className="aw-brand-mark" aria-hidden="true">
              A
            </span>
            <span>
              <strong>Agent Workspace</strong>
              <small>owner workspace</small>
            </span>
          </NavLink>
          <nav className="aw-primary-nav">
            {globalItems.map((item) => (
              <NavigationItem key={item.to} {...item} />
            ))}
          </nav>
          <div className="aw-sidebar-footer">
            <span>Runner</span>
            {onlineComputer ? <Status value={onlineComputer.status} /> : <Status value="offline" />}
          </div>
        </aside>

        <main className="aw-main">
          <header className="aw-topbar">
            <div className="aw-topbar-context">
              <span>{currentProject?.name ?? 'Personal workspace'}</span>
              <small>{snapshot.generatedAt}</small>
              <span>event stream</span>
              <Status value={connectionState} />
            </div>
            <div className="aw-topbar-actions">
              <NavLink className="aw-button aw-button--ghost" to={workspacePath('/search')}>
                搜索
              </NavLink>
            </div>
          </header>
          <div className="aw-content">{children}</div>
        </main>
      </div>

      <nav className="aw-mobile-nav" aria-label="移动端导航">
        {globalItems.slice(0, 5).map((item) => (
          <NavLink
            className={({ isActive }) => `aw-mobile-nav-item${isActive ? ' aw-nav-item--active' : ''}`}
            key={item.to}
            to={workspacePath(item.to)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function ProjectTabs({ projectId }: { projectId: string }) {
  const tabs = [
    ['chat', 'Chat'],
    ['tasks', 'Tasks'],
    ['runs', 'Runs'],
    ['changes', 'Changes'],
    ['repositories', 'Repositories'],
    ['memory', 'Memory'],
    ['automations', 'Automations'],
  ];

  return (
    <nav className="aw-project-tabs" aria-label="项目导航">
      {tabs.map(([path, label]) => (
        <NavLink
          className={({ isActive }) => `aw-project-tab${isActive ? ' aw-project-tab--active' : ''}`}
          key={path}
          to={workspacePath(`/projects/${projectId}/${path}`)}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
