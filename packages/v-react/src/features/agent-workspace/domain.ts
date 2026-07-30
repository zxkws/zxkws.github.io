export type EntityId = string;
export type EntityVersion = number;

export type ResourceRef = {
  entityType: string;
  entityId: EntityId;
  version: EntityVersion | null;
};

export type CommandReceipt<TResource = ResourceRef | null> = {
  commandId: EntityId;
  clientMutationId: string;
  resource: TResource;
  eventCursor: string;
  replayed: boolean;
};

export type ActorType = 'owner' | 'agent' | 'system';
export type AgentRuntime = 'codex' | 'claude-code';
export type AgentStatus = 'idle' | 'busy' | 'offline' | 'error' | 'disabled';
export type ComputerStatus = 'online' | 'offline' | 'draining' | 'error' | 'revoked';
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'in_review' | 'done' | 'cancelled';
export type RunStatus =
  | 'queued'
  | 'running'
  | 'waiting_input'
  | 'cancel_requested'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'interrupted';
export type DeliveryStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'partial'
  | 'outcome_unknown'
  | 'cancelled';

export type CursorPage<T> = {
  items: T[];
  pageInfo: {
    nextCursor: string | null;
    previousCursor: string | null;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};

export type CursorQuery = {
  cursor?: string;
  before?: string;
  after?: string;
  limit?: number;
};

export type RawUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  providerReportedCost: string | null;
  estimatedCost: string | null;
};

export type Project = {
  id: EntityId;
  version: EntityVersion;
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  repositoryIds: EntityId[];
  agentIds: EntityId[];
  defaultAgentId: EntityId | null;
  taskCount: number;
  runningRunCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Repository = {
  id: EntityId;
  version: EntityVersion;
  projectId: EntityId;
  name: string;
  url: string;
  registeredRootId: EntityId;
  rootAlias: string;
  relativePath: string;
  path: string;
  defaultBranch: string;
  headSha: string;
  dirty: boolean;
  computerId: EntityId;
  lastSyncResult: string | null;
  updatedAt: string;
};

export type Agent = {
  id: EntityId;
  version: EntityVersion;
  projectId: EntityId;
  name: string;
  handle: string;
  description: string;
  runtime: AgentRuntime;
  model: string;
  status: AgentStatus;
  computerId: EntityId | null;
  enabled: boolean;
  sessionId: string | null;
  sessionStatus: 'active' | 'idle' | 'reset_required' | 'unavailable';
  configurationVersion: number;
  inboxCount: number;
  currentRunId: EntityId | null;
  policy: 'project_owner' | 'host_owner';
  budget: Record<string, string | number | null>;
  repositoryIds: EntityId[];
  skills: string[];
  mcpServers: string[];
};

export type RegisteredRoot = {
  id: EntityId;
  alias: string;
  path: string;
  writable: boolean;
};

export type Computer = {
  id: EntityId;
  version: EntityVersion;
  name: string;
  status: ComputerStatus;
  daemonVersion: string;
  protocolVersion: string;
  os: string;
  architecture: string;
  lastHeartbeat: string | null;
  capabilities: string[];
  runtimeVersions: Record<string, string | null>;
  registeredRoots: RegisteredRoot[];
  currentLeaseId: string | null;
  queueDepth: number;
  outboxDepth: number;
  doctorResult: string | null;
};

export type Conversation = {
  id: EntityId;
  projectId: EntityId;
  type: 'project' | 'agent_dm' | 'task_thread';
  title: string;
  agentIds: EntityId[];
  taskId: EntityId | null;
  headCursor: string;
};

export type Message = {
  id: EntityId;
  projectId: EntityId;
  conversationId: EntityId;
  actorType: ActorType;
  actorId: EntityId | null;
  content: string;
  status: 'sent' | 'held';
  createdAt: string;
  threadRootId: EntityId | null;
  runId: EntityId | null;
  taskId: EntityId | null;
  changeSetId: EntityId | null;
  deliveryId: EntityId | null;
  attachmentIds: EntityId[];
  inReplyToInputRequestId: EntityId | null;
};

export type Task = {
  id: EntityId;
  version: EntityVersion;
  projectId: EntityId;
  messageId: EntityId;
  title: string;
  description: string | null;
  acceptanceCriteria: string[];
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedAgentId: EntityId | null;
  parentId: EntityId | null;
  dependencyIds: EntityId[];
  blockingReason: string | null;
  currentRunId: EntityId | null;
  deliveryId: EntityId | null;
  createdAt: string;
  updatedAt: string;
};

export type ContextSnapshot = {
  id: EntityId;
  projectId: EntityId;
  runId: EntityId;
  triggerMessageId: EntityId | null;
  conversationCursor: string;
  taskId: EntityId | null;
  repositoryBases: Array<{
    repositoryId: EntityId;
    baseSha: string;
    branch: string;
  }>;
  selectedMessageIds: EntityId[];
  selectedMemoryIds: EntityId[];
  attachmentIds: EntityId[];
  agentConfigurationVersion: number;
  runtime: AgentRuntime;
  model: string;
  skillIds: string[];
  mcpServerIds: string[];
  permissionSnapshot: Record<string, unknown>;
  budgetSnapshot: Record<string, unknown>;
  createdAt: string;
};

export type RunEvent = {
  id: string;
  runId: EntityId;
  sequence: string;
  type: string;
  level: 'info' | 'warning' | 'error';
  message: string | null;
  data: Record<string, unknown> | null;
  truncated: boolean;
  artifactId: EntityId | null;
  createdAt: string;
};

export type Run = {
  id: EntityId;
  version: EntityVersion;
  projectId: EntityId;
  taskId: EntityId | null;
  triggerMessageId: EntityId | null;
  agentId: EntityId;
  computerId: EntityId | null;
  status: RunStatus;
  runtime: AgentRuntime;
  model: string;
  sessionId: string | null;
  attempt: number;
  retryOfRunId: EntityId | null;
  rootRunId: EntityId;
  leaseId: string | null;
  fenceSequence: string | null;
  contextSnapshotId: EntityId;
  activeInputRequestId: EntityId | null;
  changeSetId: EntityId | null;
  checkpoint: string | null;
  error: string | null;
  usage: RawUsage;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

export type RunInputRequest = {
  id: EntityId;
  version: EntityVersion;
  projectId: EntityId;
  runId: EntityId;
  prompt: string;
  messageId: EntityId | null;
  status: 'open' | 'answered' | 'cancelled';
  responseMessageId: EntityId | null;
  createdAt: string;
  answeredAt: string | null;
};

export type FileChange = {
  path: string;
  previousPath: string | null;
  action: 'add' | 'modify' | 'delete' | 'rename';
  binary: boolean;
  diff: TextArtifactRef | null;
};

export type TextArtifactRef = {
  id: EntityId;
  kind: 'diff' | 'stdout' | 'stderr' | 'attachment' | 'run_artifact';
  mediaType: string;
  byteSize: number;
  sha256: string;
  preview: string | null;
  truncated: boolean;
  redactionStatus: 'not_required' | 'redacted' | 'failed';
};

export type RepositoryChange = {
  repositoryId: EntityId;
  baseSha: string;
  resultSha: string | null;
  branch: string;
  worktreePath: string;
  files: FileChange[];
  commands: Array<{
    id: EntityId;
    command: string;
    status: string;
    exitCode: number | null;
    startedAt: string;
    completedAt: string | null;
    stdout: TextArtifactRef | null;
    stderr: TextArtifactRef | null;
  }>;
};

export type ChangeSet = {
  id: EntityId;
  version: EntityVersion;
  projectId: EntityId;
  runId: EntityId;
  taskId: EntityId | null;
  status: 'draft' | 'ready' | 'approved' | 'rejected' | 'delivering' | 'delivered' | 'delivery_failed';
  summary: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  repositoryChanges: RepositoryChange[];
  deliveryId: EntityId | null;
  createdAt: string;
};

export type DeliveryTarget = {
  id: EntityId;
  repositoryId: EntityId;
  kind: 'commit' | 'push' | 'pull_request' | 'deploy';
  status: DeliveryStatus;
  attempt: number;
  reference: string | null;
  detail: string | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

export type Delivery = {
  id: EntityId;
  version: EntityVersion;
  projectId: EntityId;
  changeSetId: EntityId;
  taskId: EntityId | null;
  status: DeliveryStatus;
  targets: DeliveryTarget[];
  createdAt: string;
  completedAt: string | null;
};

type MemoryEntryBase = {
  id: EntityId;
  version: EntityVersion;
  projectId: EntityId;
  content: string;
  provenanceType: 'owner' | 'message' | 'task' | 'run';
  provenanceId: string | null;
  confidence: string | null;
  expiresAt: string | null;
  pinned: boolean;
  createdAt: string;
};

export type MemoryEntry = MemoryEntryBase &
  (
    | {
        scope: 'project';
        agentId: null;
      }
    | {
        scope: 'agent';
        agentId: EntityId;
      }
  );

export type AutomationTrigger =
  | {
      type: 'schedule';
      cron: string;
      timezone: string;
    }
  | {
      type: 'webhook';
      path: string;
    }
  | {
      type: 'github_event';
      repositoryId: EntityId;
      event: string;
      filters: Record<string, unknown>;
    };

export type Automation = {
  id: EntityId;
  version: EntityVersion;
  projectId: EntityId;
  name: string;
  trigger: AutomationTrigger;
  instruction: string;
  repositoryIds: EntityId[];
  agentId: EntityId;
  enabled: boolean;
  taskPolicy: 'create_task' | 'message_only';
  deliveryPolicy: 'change_set_only' | 'deliver';
  missedRunPolicy: 'skip' | 'run_once' | 'backfill';
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastResult: string | null;
};

export type InboxItem = {
  id: EntityId;
  version: EntityVersion;
  projectId: EntityId | null;
  type:
    | 'waiting_input'
    | 'failed'
    | 'interrupted'
    | 'blocked'
    | 'outcome_unknown'
    | 'runner_offline'
    | 'git_conflict'
    | 'partial_delivery';
  title: string;
  detail: string | null;
  entityType: 'task' | 'run' | 'delivery' | 'computer';
  entityId: EntityId;
  status: string;
  read: boolean;
  createdAt: string;
};

export type ActivityEvent = {
  id: string;
  projectId: EntityId | null;
  actorType: ActorType;
  actorId: EntityId | null;
  type: string;
  entityType: string;
  entityId: EntityId;
  message: string | null;
  createdAt: string;
};

export type WorkspaceSettings = {
  version: EntityVersion;
  ownerMode: 'project_owner' | 'host_owner';
  defaultProjectId: EntityId | null;
  maxConcurrentRuns: number;
  maxAgentHandoffDepth: number;
  notificationMuted: boolean;
  quietHours: {
    timezone: string;
    start: string;
    end: string;
  } | null;
};

export type WorkspaceBootstrap = {
  generatedAt: string;
  eventCursor: string;
  inbox: InboxItem[];
  activities: ActivityEvent[];
  projects: Project[];
  repositories: Repository[];
  agents: Agent[];
  computers: Computer[];
  conversations: Conversation[];
  settings: WorkspaceSettings;
};

export type WorkspaceSnapshot = WorkspaceBootstrap & {
  messages: Message[];
  tasks: Task[];
  runs: Run[];
  runInputRequests: RunInputRequest[];
  runEvents: RunEvent[];
  contextSnapshots: ContextSnapshot[];
  changeSets: ChangeSet[];
  deliveries: Delivery[];
  memories: MemoryEntry[];
  automations: Automation[];
  attachments: Attachment[];
};

export type ProjectOverview = {
  project: Project;
  repositories: Repository[];
  agents: Agent[];
  conversations: Conversation[];
  taskCounts: Record<string, number>;
  runCounts: Record<string, number>;
  changeSetCounts: Record<string, number>;
};

export type TaskDetail = {
  task: Task;
  triggerMessage: Message | null;
  threadMessages: CursorPage<Message>;
  relatedTasks: Task[];
  runs: Run[];
};

export type RunDetail = {
  run: Run;
  inputRequests: RunInputRequest[];
  contextSnapshot: ContextSnapshot;
  events: CursorPage<RunEvent>;
  changeSet: ChangeSet | null;
  delivery: Delivery | null;
};

export type ChangeSetDetail = {
  changeSet: ChangeSet;
  delivery: Delivery | null;
};

export type WorkspaceEventEnvelope = {
  cursor: string;
  id: EntityId;
  type: string;
  projectId: EntityId | null;
  entityType: string;
  entityId: EntityId;
  occurredAt: string;
  data: Record<string, unknown> | null;
};

export type WorkspaceConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'auth_failed';

export type Attachment = {
  id: EntityId;
  version: EntityVersion;
  projectId: EntityId;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  status: 'pending' | 'available' | 'failed';
  createdAt: string;
};

export type Artifact = {
  id: EntityId;
  projectId: EntityId;
  runId: EntityId | null;
  kind: 'diff' | 'stdout' | 'stderr' | 'log' | 'file' | 'report';
  fileName: string | null;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  createdAt: string;
};

export type AttachmentUploadGrant = {
  attachmentId: EntityId;
  attachmentVersion: EntityVersion;
  uploadUrl: string;
  method: 'PUT' | 'POST';
  headers: Record<string, string>;
  expiresAt: string;
  maxBytes: number;
};

export type PrivateDownloadGrant = {
  url: string;
  expiresAt: string;
};

export type SearchResult = {
  id: string;
  entityType: 'project' | 'message' | 'task' | 'run' | 'change_set' | 'delivery' | 'agent' | 'memory' | 'repository';
  entityId: EntityId;
  projectId: EntityId | null;
  title: string;
  snippet: string;
  rawStatus: string | null;
};

export type SendMessageInput = {
  projectId: EntityId;
  conversationId: EntityId;
  content: string;
  agentId: EntityId | null;
  asTask: boolean;
  attachmentIds: EntityId[];
  clientMutationId: string;
};

export type StartRunInput = {
  projectId: EntityId;
  taskId: EntityId | null;
  agentId: EntityId;
  triggerMessageId: EntityId | null;
  clientMutationId: string;
};

export type MutationInput = {
  clientMutationId: string;
};

export type VersionedMutationInput = MutationInput & {
  expectedVersion: EntityVersion;
};

export type CreateProjectInput = MutationInput & {
  name: string;
  description: string | null;
};

export type UpdateProjectInput = VersionedMutationInput & {
  name?: string;
  description?: string | null;
  defaultAgentId?: EntityId | null;
};

export type CreateRepositoryInput = MutationInput & {
  projectId: EntityId;
  name: string;
  url: string;
  registeredRootId: EntityId;
  rootAlias: string;
  relativePath: string;
  defaultBranch: string;
  computerId: EntityId;
};

export type UpdateRepositoryInput = VersionedMutationInput &
  Partial<
    Pick<
      CreateRepositoryInput,
      'name' | 'url' | 'registeredRootId' | 'rootAlias' | 'relativePath' | 'defaultBranch' | 'computerId'
    >
  >;

export type CreateAgentInput = MutationInput & {
  projectId: EntityId;
  name: string;
  handle: string;
  description: string;
  runtime: AgentRuntime;
  model: string;
  computerId: EntityId | null;
  policy: Agent['policy'];
  budget: Agent['budget'];
  repositoryIds: EntityId[];
  skills: string[];
  mcpServers: string[];
};

export type UpdateAgentInput = VersionedMutationInput &
  Partial<
    Pick<
      CreateAgentInput,
      | 'name'
      | 'handle'
      | 'description'
      | 'runtime'
      | 'model'
      | 'computerId'
      | 'policy'
      | 'budget'
      | 'repositoryIds'
      | 'skills'
      | 'mcpServers'
    >
  >;

export type UpdateTaskInput = VersionedMutationInput &
  Partial<
    Pick<
      Task,
      | 'title'
      | 'description'
      | 'acceptanceCriteria'
      | 'status'
      | 'priority'
      | 'assignedAgentId'
      | 'dependencyIds'
      | 'blockingReason'
    >
  >;

export type ReplyToRunInput = MutationInput & {
  runId: EntityId;
  inputRequestId: EntityId;
  content: string;
  attachmentIds: EntityId[];
};

export type DeliveryTargetInput = {
  repositoryId: EntityId;
  kind: DeliveryTarget['kind'];
  branch: string | null;
  title: string | null;
  description: string | null;
  options: Record<string, unknown>;
};

export type CreateDeliveryInput = VersionedMutationInput & {
  changeSetId: EntityId;
  targets: DeliveryTargetInput[];
};

export type CreateAutomationInput = MutationInput & {
  projectId: EntityId;
  name: string;
  trigger: AutomationTrigger;
  instruction: string;
  repositoryIds: EntityId[];
  agentId: EntityId;
  taskPolicy: Automation['taskPolicy'];
  deliveryPolicy: Automation['deliveryPolicy'];
  missedRunPolicy: Automation['missedRunPolicy'];
  enabled: boolean;
};

export type CreateMemoryInput = MutationInput & {
  projectId: EntityId;
  content: string;
} & (
    | {
        scope: 'project';
        agentId: null;
      }
    | {
        scope: 'agent';
        agentId: EntityId;
      }
  );

export type UpdateAutomationInput = VersionedMutationInput &
  Partial<
    Pick<
      CreateAutomationInput,
      | 'name'
      | 'trigger'
      | 'instruction'
      | 'repositoryIds'
      | 'agentId'
      | 'taskPolicy'
      | 'deliveryPolicy'
      | 'missedRunPolicy'
      | 'enabled'
    >
  >;

export type ComputerPairing = {
  id: EntityId;
  code: string;
  expiresAt: string;
  status: 'pending';
  installCommand: string;
};

export type SendMessageResult = {
  messageId: EntityId;
  taskId: EntityId | null;
};

export type CreateAttachmentUploadInput = MutationInput & {
  projectId: EntityId;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
};

export type CompleteAttachmentUploadInput = VersionedMutationInput & {
  sizeBytes: number;
  sha256: string;
};
