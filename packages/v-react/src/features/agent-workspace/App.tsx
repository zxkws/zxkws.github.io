import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AgentWorkspaceProvider, useWorkspaceBootstrap, useWorkspaceConnectionState } from './data/context';
import { ErrorState, LoadingState } from './components/Primitives';
import { WorkspaceLayout } from './components/WorkspaceLayout';
import { InboxPage, ActivityPage } from './pages/InboxPages';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectChatPage } from './pages/ProjectChatPage';
import { ProjectTasksPage, TaskDetailPage } from './pages/ProjectTasksPages';
import { ProjectRunsPage, RunDetailPage } from './pages/ProjectRunsPages';
import { ChangeSetDetailPage, DeliveryDetailPage, ProjectChangesPage } from './pages/ProjectChangesPages';
import { ProjectAutomationsPage, ProjectMemoryPage, ProjectRepositoriesPage } from './pages/ProjectResourcesPages';
import { AgentDetailPage, AgentsPage } from './pages/AgentsPages';
import { ComputerDetailPage, ComputersPage } from './pages/ComputersPages';
import { SearchPage, SettingsPage } from './pages/SearchSettingsPages';
import './styles.css';

function WorkspaceRoutes() {
  const snapshotQuery = useWorkspaceBootstrap();
  const connectionState = useWorkspaceConnectionState();

  if (snapshotQuery.isPending) return <LoadingState />;
  if (!snapshotQuery.data && snapshotQuery.isError) {
    return <ErrorState error={snapshotQuery.error} retry={() => void snapshotQuery.refetch()} />;
  }

  const snapshot = snapshotQuery.data;
  if (!snapshot) return <LoadingState />;

  const ProjectRoute = ({ page }: { page: (projectId: string) => React.ReactNode }) => {
    const { projectId } = useParams();
    return projectId ? page(projectId) : <ErrorState error="projectId: undefined" />;
  };

  const TaskRoute = () => {
    const { projectId, taskId } = useParams();
    return projectId && taskId ? (
      <TaskDetailPage snapshot={snapshot} projectId={projectId} taskId={taskId} />
    ) : (
      <ErrorState error="projectId/taskId: undefined" />
    );
  };

  const RunRoute = () => {
    const { projectId, runId } = useParams();
    return projectId && runId ? (
      <RunDetailPage snapshot={snapshot} projectId={projectId} runId={runId} />
    ) : (
      <ErrorState error="projectId/runId: undefined" />
    );
  };

  const ChangeSetRoute = () => {
    const { projectId, changeSetId } = useParams();
    return projectId && changeSetId ? (
      <ChangeSetDetailPage snapshot={snapshot} projectId={projectId} changeSetId={changeSetId} />
    ) : (
      <ErrorState error="projectId/changeSetId: undefined" />
    );
  };

  const AgentRoute = () => {
    const { agentId } = useParams();
    return agentId ? (
      <AgentDetailPage snapshot={snapshot} agentId={agentId} />
    ) : (
      <ErrorState error="agentId: undefined" />
    );
  };

  const ComputerRoute = () => {
    const { computerId } = useParams();
    return computerId ? (
      <ComputerDetailPage snapshot={snapshot} computerId={computerId} />
    ) : (
      <ErrorState error="computerId: undefined" />
    );
  };

  const DeliveryRoute = () => {
    const { deliveryId } = useParams();
    return deliveryId ? (
      <DeliveryDetailPage snapshot={snapshot} deliveryId={deliveryId} />
    ) : (
      <ErrorState error="deliveryId: undefined" />
    );
  };

  return (
    <WorkspaceLayout snapshot={snapshot} connectionState={connectionState}>
      {snapshotQuery.isError && (
        <div className="aw-banner aw-banner--warning" role="status">
          Disconnected:{' '}
          {snapshotQuery.error instanceof Error ? snapshotQuery.error.message : String(snapshotQuery.error)}
        </div>
      )}
      <Routes>
        <Route index element={<Navigate to="inbox" replace />} />
        <Route path="inbox" element={<InboxPage snapshot={snapshot} />} />
        <Route path="inbox/activity" element={<ActivityPage snapshot={snapshot} />} />
        <Route path="activity" element={<Navigate to="../inbox/activity" replace />} />
        <Route path="projects" element={<ProjectsPage snapshot={snapshot} />} />
        <Route path="projects/:projectId" element={<Navigate to="chat" replace />} />
        <Route
          path="projects/:projectId/chat"
          element={<ProjectRoute page={(projectId) => <ProjectChatPage snapshot={snapshot} projectId={projectId} />} />}
        />
        <Route
          path="projects/:projectId/tasks"
          element={
            <ProjectRoute page={(projectId) => <ProjectTasksPage snapshot={snapshot} projectId={projectId} />} />
          }
        />
        <Route path="projects/:projectId/tasks/:taskId" element={<TaskRoute />} />
        <Route
          path="projects/:projectId/runs"
          element={<ProjectRoute page={(projectId) => <ProjectRunsPage snapshot={snapshot} projectId={projectId} />} />}
        />
        <Route path="projects/:projectId/runs/:runId" element={<RunRoute />} />
        <Route
          path="projects/:projectId/changes"
          element={
            <ProjectRoute page={(projectId) => <ProjectChangesPage snapshot={snapshot} projectId={projectId} />} />
          }
        />
        <Route path="projects/:projectId/changes/:changeSetId" element={<ChangeSetRoute />} />
        <Route
          path="projects/:projectId/repositories"
          element={
            <ProjectRoute page={(projectId) => <ProjectRepositoriesPage snapshot={snapshot} projectId={projectId} />} />
          }
        />
        <Route
          path="projects/:projectId/memory"
          element={
            <ProjectRoute page={(projectId) => <ProjectMemoryPage snapshot={snapshot} projectId={projectId} />} />
          }
        />
        <Route
          path="projects/:projectId/automations"
          element={
            <ProjectRoute page={(projectId) => <ProjectAutomationsPage snapshot={snapshot} projectId={projectId} />} />
          }
        />
        <Route path="agents" element={<AgentsPage snapshot={snapshot} />} />
        <Route path="agents/:agentId" element={<AgentRoute />} />
        <Route path="computers" element={<ComputersPage snapshot={snapshot} />} />
        <Route path="computers/:computerId" element={<ComputerRoute />} />
        <Route path="deliveries/:deliveryId" element={<DeliveryRoute />} />
        <Route path="search" element={<SearchPage snapshot={snapshot} />} />
        <Route path="settings" element={<SettingsPage snapshot={snapshot} />} />
        <Route path="*" element={<ErrorState error="页面不存在" />} />
      </Routes>
    </WorkspaceLayout>
  );
}

export default function AgentWorkspaceApp() {
  return (
    <AgentWorkspaceProvider>
      <WorkspaceRoutes />
    </AgentWorkspaceProvider>
  );
}
