import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import type { CursorQuery, EntityId, WorkspaceConnectionState, WorkspaceEventEnvelope } from '../domain';
import type { AgentWorkspaceClient, ProjectListQuery, WorkspaceSignal } from './client';
import { createHttpAgentWorkspaceClient } from './http-client';

const WorkspaceClientContext = createContext<AgentWorkspaceClient | null>(null);
const defaultClient = createHttpAgentWorkspaceClient();
const queryStaleTime = 10_000;

const cursorQueryKey = (query: CursorQuery = {}) =>
  [query.cursor ?? null, query.before ?? null, query.after ?? null, query.limit ?? null] as const;

const projectListQueryKey = (query: ProjectListQuery = {}) => [...cursorQueryKey(query), query.status ?? null] as const;

export const workspaceQueryKeys = {
  all: ['agent-workspace'] as const,
  bootstrap: () => [...workspaceQueryKeys.all, 'bootstrap'] as const,
  inboxRoot: () => [...workspaceQueryKeys.all, 'inbox'] as const,
  inbox: (query?: CursorQuery) => [...workspaceQueryKeys.inboxRoot(), cursorQueryKey(query)] as const,
  activityRoot: () => [...workspaceQueryKeys.all, 'activity'] as const,
  activity: (query?: CursorQuery) => [...workspaceQueryKeys.activityRoot(), cursorQueryKey(query)] as const,
  projectRoot: (projectId: EntityId) => [...workspaceQueryKeys.all, 'projects', projectId] as const,
  projectOverview: (projectId: EntityId) => [...workspaceQueryKeys.projectRoot(projectId), 'overview'] as const,
  messagesRoot: (projectId: EntityId) => [...workspaceQueryKeys.projectRoot(projectId), 'messages'] as const,
  conversationMessagesRoot: (projectId: EntityId, conversationId: EntityId) =>
    [...workspaceQueryKeys.messagesRoot(projectId), conversationId] as const,
  messages: (projectId: EntityId, conversationId: EntityId, query?: CursorQuery) =>
    [...workspaceQueryKeys.conversationMessagesRoot(projectId, conversationId), cursorQueryKey(query)] as const,
  tasksRoot: (projectId: EntityId) => [...workspaceQueryKeys.projectRoot(projectId), 'tasks'] as const,
  tasks: (projectId: EntityId, query?: ProjectListQuery) =>
    [...workspaceQueryKeys.tasksRoot(projectId), projectListQueryKey(query)] as const,
  task: (taskId: EntityId) => [...workspaceQueryKeys.all, 'tasks', taskId] as const,
  runsRoot: (projectId: EntityId) => [...workspaceQueryKeys.projectRoot(projectId), 'runs'] as const,
  runs: (projectId: EntityId, query?: ProjectListQuery) =>
    [...workspaceQueryKeys.runsRoot(projectId), projectListQueryKey(query)] as const,
  run: (runId: EntityId) => [...workspaceQueryKeys.all, 'runs', runId] as const,
  runEventsRoot: (runId: EntityId) => [...workspaceQueryKeys.run(runId), 'events'] as const,
  runEvents: (runId: EntityId, query?: CursorQuery) =>
    [...workspaceQueryKeys.runEventsRoot(runId), cursorQueryKey(query)] as const,
  changeSetsRoot: (projectId: EntityId) => [...workspaceQueryKeys.projectRoot(projectId), 'change-sets'] as const,
  changeSets: (projectId: EntityId, query?: ProjectListQuery) =>
    [...workspaceQueryKeys.changeSetsRoot(projectId), projectListQueryKey(query)] as const,
  changeSet: (changeSetId: EntityId) => [...workspaceQueryKeys.all, 'change-sets', changeSetId] as const,
  delivery: (deliveryId: EntityId) => [...workspaceQueryKeys.all, 'deliveries', deliveryId] as const,
  memoriesRoot: (projectId: EntityId) => [...workspaceQueryKeys.projectRoot(projectId), 'memories'] as const,
  memories: (projectId: EntityId, query?: CursorQuery) =>
    [...workspaceQueryKeys.memoriesRoot(projectId), cursorQueryKey(query)] as const,
  automationsRoot: (projectId: EntityId) => [...workspaceQueryKeys.projectRoot(projectId), 'automations'] as const,
  automations: (projectId: EntityId, query?: CursorQuery) =>
    [...workspaceQueryKeys.automationsRoot(projectId), cursorQueryKey(query)] as const,
  eventsRoot: () => [...workspaceQueryKeys.all, 'events'] as const,
  events: (after: string, limit?: number) => [...workspaceQueryKeys.eventsRoot(), after, limit ?? null] as const,
  attachment: (id: EntityId) => [...workspaceQueryKeys.all, 'attachments', id] as const,
  attachmentDownload: (id: EntityId) => [...workspaceQueryKeys.attachment(id), 'download'] as const,
  artifact: (id: EntityId) => [...workspaceQueryKeys.all, 'artifacts', id] as const,
  artifactDownload: (id: EntityId) => [...workspaceQueryKeys.artifact(id), 'download'] as const,
  searchRoot: () => [...workspaceQueryKeys.all, 'search'] as const,
  search: (query: string, page?: CursorQuery) =>
    [...workspaceQueryKeys.searchRoot(), query, cursorQueryKey(page)] as const,
};

type WorkspaceQueryKey = readonly unknown[];

const dataId = (event: WorkspaceEventEnvelope, key: string) => {
  const value = event.data?.[key];
  return typeof value === 'string' ? value : null;
};

const eventQueryKeys = (event: WorkspaceEventEnvelope): WorkspaceQueryKey[] => {
  const keys: WorkspaceQueryKey[] = [workspaceQueryKeys.activityRoot(), workspaceQueryKeys.eventsRoot()];
  const projectId = event.projectId ?? (event.entityType === 'project' ? event.entityId : null);

  if (projectId) keys.push(workspaceQueryKeys.projectOverview(projectId));

  switch (event.entityType) {
    case 'project':
    case 'repository':
    case 'agent':
    case 'conversation':
      keys.push(workspaceQueryKeys.bootstrap());
      break;
    case 'computer':
    case 'settings':
      keys.push(workspaceQueryKeys.bootstrap());
      break;
    case 'message':
      if (projectId) {
        const conversationId = dataId(event, 'conversationId');
        keys.push(
          conversationId
            ? workspaceQueryKeys.conversationMessagesRoot(projectId, conversationId)
            : workspaceQueryKeys.messagesRoot(projectId),
        );
      }
      break;
    case 'task':
      keys.push(
        workspaceQueryKeys.bootstrap(),
        workspaceQueryKeys.inboxRoot(),
        workspaceQueryKeys.task(event.entityId),
      );
      if (projectId) keys.push(workspaceQueryKeys.tasksRoot(projectId));
      break;
    case 'run':
      keys.push(
        workspaceQueryKeys.bootstrap(),
        workspaceQueryKeys.inboxRoot(),
        workspaceQueryKeys.run(event.entityId),
        workspaceQueryKeys.runEventsRoot(event.entityId),
      );
      if (projectId) keys.push(workspaceQueryKeys.runsRoot(projectId));
      break;
    case 'run_event': {
      const runId = dataId(event, 'runId');
      if (runId) {
        keys.push(workspaceQueryKeys.run(runId), workspaceQueryKeys.runEventsRoot(runId));
      }
      break;
    }
    case 'run_input_request': {
      const runId = dataId(event, 'runId');
      if (runId) keys.push(workspaceQueryKeys.run(runId));
      break;
    }
    case 'change_set': {
      keys.push(workspaceQueryKeys.bootstrap(), workspaceQueryKeys.changeSet(event.entityId));
      if (projectId) keys.push(workspaceQueryKeys.changeSetsRoot(projectId));
      const runId = dataId(event, 'runId');
      if (runId) keys.push(workspaceQueryKeys.run(runId));
      break;
    }
    case 'delivery': {
      keys.push(
        workspaceQueryKeys.bootstrap(),
        workspaceQueryKeys.inboxRoot(),
        workspaceQueryKeys.delivery(event.entityId),
      );
      if (projectId) keys.push(workspaceQueryKeys.changeSetsRoot(projectId));
      const changeSetId = dataId(event, 'changeSetId');
      if (changeSetId) keys.push(workspaceQueryKeys.changeSet(changeSetId));
      const runId = dataId(event, 'runId');
      if (runId) keys.push(workspaceQueryKeys.run(runId));
      break;
    }
    case 'memory':
      if (projectId) keys.push(workspaceQueryKeys.memoriesRoot(projectId));
      break;
    case 'automation':
      if (projectId) keys.push(workspaceQueryKeys.automationsRoot(projectId));
      break;
    case 'attachment':
      keys.push(workspaceQueryKeys.attachment(event.entityId));
      break;
    case 'artifact': {
      keys.push(workspaceQueryKeys.artifact(event.entityId));
      const runId = dataId(event, 'runId');
      if (runId) keys.push(workspaceQueryKeys.run(runId));
      break;
    }
    case 'inbox':
    case 'inbox_item':
      keys.push(workspaceQueryKeys.bootstrap(), workspaceQueryKeys.inboxRoot());
      break;
  }

  return keys;
};

const isQueryKeyPrefix = (prefix: WorkspaceQueryKey, candidate: WorkspaceQueryKey) =>
  prefix.length <= candidate.length && prefix.every((segment, index) => Object.is(segment, candidate[index]));

export function AgentWorkspaceProvider({
  children,
  client = defaultClient,
}: PropsWithChildren<{ client?: AgentWorkspaceClient }>) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const pendingKeys = new Map<string, WorkspaceQueryKey>();
    let invalidationTimer: ReturnType<typeof setTimeout> | null = null;

    const flushStreamInvalidations = () => {
      invalidationTimer = null;
      const keys = [...pendingKeys.values()];
      pendingKeys.clear();
      keys.forEach((queryKey) => {
        void queryClient.invalidateQueries({ queryKey });
      });
    };

    const queueStreamInvalidation = (queryKey: WorkspaceQueryKey) => {
      if ([...pendingKeys.values()].some((key) => isQueryKeyPrefix(key, queryKey))) return;
      [...pendingKeys.entries()].forEach(([hash, key]) => {
        if (isQueryKeyPrefix(queryKey, key)) pendingKeys.delete(hash);
      });
      pendingKeys.set(JSON.stringify(queryKey), queryKey);
      invalidationTimer ??= setTimeout(flushStreamInvalidations, 250);
    };

    const handleSignal = (signal: WorkspaceSignal) => {
      if (signal.source === 'stream') {
        eventQueryKeys(signal.event).forEach(queueStreamInvalidation);
        return;
      }
      if (signal.source === 'mutation') {
        void queryClient.invalidateQueries({
          queryKey: workspaceQueryKeys.all,
          type: 'active',
        });
        return;
      }
      if (signal.source === 'resync') {
        void queryClient.invalidateQueries({
          queryKey: workspaceQueryKeys.bootstrap(),
          refetchType: 'active',
        });
      }
    };

    const unsubscribe = client.subscribe(handleSignal);
    return () => {
      unsubscribe();
      if (invalidationTimer) clearTimeout(invalidationTimer);
      pendingKeys.clear();
    };
  }, [client, queryClient]);

  return <WorkspaceClientContext.Provider value={client}>{children}</WorkspaceClientContext.Provider>;
}

export function useAgentWorkspaceClient() {
  const client = useContext(WorkspaceClientContext);
  if (!client) throw new Error('AgentWorkspaceProvider is missing');
  return client;
}

const getServerConnectionState = (): WorkspaceConnectionState => 'idle';

export function useWorkspaceConnectionState() {
  const client = useAgentWorkspaceClient();
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      client.subscribe((signal) => {
        if (signal.source === 'connection') onStoreChange();
      }),
    [client],
  );
  return useSyncExternalStore(subscribe, client.getConnectionState, getServerConnectionState);
}

export function useWorkspaceBootstrap() {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.bootstrap(),
    queryFn: ({ signal }) => client.getBootstrap(signal),
    staleTime: queryStaleTime,
  });
}

export function useInbox(query?: CursorQuery) {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.inbox(query),
    queryFn: ({ signal }) => client.listInbox(query, signal),
    staleTime: queryStaleTime,
  });
}

export function useActivity(query?: CursorQuery) {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.activity(query),
    queryFn: ({ signal }) => client.listActivity(query, signal),
    staleTime: queryStaleTime,
  });
}

export function useProjectOverview(projectId: EntityId) {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.projectOverview(projectId),
    queryFn: ({ signal }) => client.getProjectOverview(projectId, signal),
    enabled: Boolean(projectId),
    staleTime: queryStaleTime,
  });
}

export function useMessages(projectId: EntityId, conversationId: EntityId, query?: CursorQuery) {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.messages(projectId, conversationId, query),
    queryFn: ({ signal }) => client.listMessages(projectId, conversationId, query, signal),
    enabled: Boolean(projectId && conversationId),
    staleTime: queryStaleTime,
  });
}

export function useTasks(projectId: EntityId, query?: ProjectListQuery) {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.tasks(projectId, query),
    queryFn: ({ signal }) => client.listTasks(projectId, query, signal),
    enabled: Boolean(projectId),
    staleTime: queryStaleTime,
  });
}

export function useTask(taskId: EntityId) {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.task(taskId),
    queryFn: ({ signal }) => client.getTask(taskId, signal),
    enabled: Boolean(taskId),
    staleTime: queryStaleTime,
  });
}

export function useRuns(projectId: EntityId, query?: ProjectListQuery) {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.runs(projectId, query),
    queryFn: ({ signal }) => client.listRuns(projectId, query, signal),
    enabled: Boolean(projectId),
    staleTime: queryStaleTime,
  });
}

export function useRun(runId: EntityId) {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.run(runId),
    queryFn: ({ signal }) => client.getRun(runId, signal),
    enabled: Boolean(runId),
    staleTime: queryStaleTime,
  });
}

export function useRunEvents(runId: EntityId, query?: CursorQuery) {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.runEvents(runId, query),
    queryFn: ({ signal }) => client.listRunEvents(runId, query, signal),
    enabled: Boolean(runId),
    staleTime: queryStaleTime,
  });
}

export function useChangeSets(projectId: EntityId, query?: ProjectListQuery) {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.changeSets(projectId, query),
    queryFn: ({ signal }) => client.listChangeSets(projectId, query, signal),
    enabled: Boolean(projectId),
    staleTime: queryStaleTime,
  });
}

export function useChangeSet(changeSetId: EntityId) {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.changeSet(changeSetId),
    queryFn: ({ signal }) => client.getChangeSet(changeSetId, signal),
    enabled: Boolean(changeSetId),
    staleTime: queryStaleTime,
  });
}

export function useDelivery(deliveryId: EntityId) {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.delivery(deliveryId),
    queryFn: ({ signal }) => client.getDelivery(deliveryId, signal),
    enabled: Boolean(deliveryId),
    staleTime: queryStaleTime,
  });
}

export function useMemories(projectId: EntityId, query?: CursorQuery) {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.memories(projectId, query),
    queryFn: ({ signal }) => client.listMemories(projectId, query, signal),
    enabled: Boolean(projectId),
    staleTime: queryStaleTime,
  });
}

export function useAutomations(projectId: EntityId, query?: CursorQuery) {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.automations(projectId, query),
    queryFn: ({ signal }) => client.listAutomations(projectId, query, signal),
    enabled: Boolean(projectId),
    staleTime: queryStaleTime,
  });
}

export function useEvents(after: string, limit?: number) {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.events(after, limit),
    queryFn: ({ signal }) => client.getEvents(after, limit, signal),
    staleTime: queryStaleTime,
  });
}

export function useAttachment(id: EntityId) {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.attachment(id),
    queryFn: ({ signal }) => client.getAttachment(id, signal),
    enabled: Boolean(id),
    staleTime: queryStaleTime,
  });
}

export function useAttachmentDownload(id: EntityId) {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.attachmentDownload(id),
    queryFn: ({ signal }) => client.getAttachmentDownload(id, signal),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

export function useArtifact(id: EntityId) {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.artifact(id),
    queryFn: ({ signal }) => client.getArtifact(id, signal),
    enabled: Boolean(id),
    staleTime: queryStaleTime,
  });
}

export function useArtifactDownload(id: EntityId) {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.artifactDownload(id),
    queryFn: ({ signal }) => client.getArtifactDownload(id, signal),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

export function useWorkspaceSearch(query: string, page?: CursorQuery) {
  const client = useAgentWorkspaceClient();
  return useQuery({
    queryKey: workspaceQueryKeys.search(query, page),
    queryFn: ({ signal }) => client.search(query, page, signal),
    enabled: query.length > 0,
    staleTime: queryStaleTime,
  });
}
