import type {
  ActivityEvent,
  Artifact,
  Attachment,
  AttachmentUploadGrant,
  Automation,
  ChangeSet,
  ChangeSetDetail,
  CommandReceipt,
  ComputerPairing,
  CompleteAttachmentUploadInput,
  CreateAgentInput,
  CreateAttachmentUploadInput,
  CreateAutomationInput,
  CreateDeliveryInput,
  CreateMemoryInput,
  CreateProjectInput,
  CreateRepositoryInput,
  CursorPage,
  CursorQuery,
  Delivery,
  EntityId,
  InboxItem,
  MemoryEntry,
  Message,
  MutationInput,
  PrivateDownloadGrant,
  ProjectOverview,
  ReplyToRunInput,
  ResourceRef,
  Run,
  RunDetail,
  RunEvent,
  SearchResult,
  SendMessageResult,
  SendMessageInput,
  StartRunInput,
  Task,
  TaskDetail,
  UpdateAgentInput,
  UpdateAutomationInput,
  UpdateProjectInput,
  UpdateRepositoryInput,
  UpdateTaskInput,
  VersionedMutationInput,
  WorkspaceSettings,
  WorkspaceBootstrap,
  WorkspaceConnectionState,
  WorkspaceEventEnvelope,
} from '../domain';

export type WorkspaceSignal =
  | { source: 'stream'; event: WorkspaceEventEnvelope }
  | { source: 'mutation'; receipt: CommandReceipt<unknown> }
  | { source: 'connection'; state: WorkspaceConnectionState }
  | { source: 'resync'; reason: string };

export type WorkspaceListener = (signal: WorkspaceSignal) => void;

export type ProjectListQuery = CursorQuery & {
  status?: string;
};

export interface AgentWorkspaceClient {
  getBootstrap(signal?: AbortSignal): Promise<WorkspaceBootstrap>;
  listInbox(query?: CursorQuery, signal?: AbortSignal): Promise<CursorPage<InboxItem>>;
  listActivity(query?: CursorQuery, signal?: AbortSignal): Promise<CursorPage<ActivityEvent>>;
  getProjectOverview(projectId: EntityId, signal?: AbortSignal): Promise<ProjectOverview>;
  listMessages(
    projectId: EntityId,
    conversationId: EntityId,
    query?: CursorQuery,
    signal?: AbortSignal,
  ): Promise<CursorPage<Message>>;
  listTasks(projectId: EntityId, query?: ProjectListQuery, signal?: AbortSignal): Promise<CursorPage<Task>>;
  getTask(taskId: EntityId, signal?: AbortSignal): Promise<TaskDetail>;
  listRuns(projectId: EntityId, query?: ProjectListQuery, signal?: AbortSignal): Promise<CursorPage<Run>>;
  getRun(runId: EntityId, signal?: AbortSignal): Promise<RunDetail>;
  listRunEvents(runId: EntityId, query?: CursorQuery, signal?: AbortSignal): Promise<CursorPage<RunEvent>>;
  listChangeSets(projectId: EntityId, query?: ProjectListQuery, signal?: AbortSignal): Promise<CursorPage<ChangeSet>>;
  getChangeSet(changeSetId: EntityId, signal?: AbortSignal): Promise<ChangeSetDetail>;
  getDelivery(deliveryId: EntityId, signal?: AbortSignal): Promise<Delivery>;
  listMemories(projectId: EntityId, query?: CursorQuery, signal?: AbortSignal): Promise<CursorPage<MemoryEntry>>;
  listAutomations(projectId: EntityId, query?: CursorQuery, signal?: AbortSignal): Promise<CursorPage<Automation>>;
  getEvents(after: string, limit?: number, signal?: AbortSignal): Promise<CursorPage<WorkspaceEventEnvelope>>;
  getAttachment(id: EntityId, signal?: AbortSignal): Promise<Attachment>;
  getAttachmentDownload(id: EntityId, signal?: AbortSignal): Promise<PrivateDownloadGrant>;
  getArtifact(id: EntityId, signal?: AbortSignal): Promise<Artifact>;
  getArtifactDownload(id: EntityId, signal?: AbortSignal): Promise<PrivateDownloadGrant>;
  getConnectionState(): WorkspaceConnectionState;
  subscribe(listener: WorkspaceListener): () => void;
  createProject(input: CreateProjectInput): Promise<CommandReceipt<ResourceRef>>;
  updateProject(id: EntityId, input: UpdateProjectInput): Promise<CommandReceipt<ResourceRef>>;
  archiveProject(id: EntityId, input: VersionedMutationInput): Promise<CommandReceipt<ResourceRef>>;
  createRepository(input: CreateRepositoryInput): Promise<CommandReceipt<ResourceRef>>;
  updateRepository(id: EntityId, input: UpdateRepositoryInput): Promise<CommandReceipt<ResourceRef>>;
  removeRepository(id: EntityId, input: VersionedMutationInput): Promise<CommandReceipt<ResourceRef>>;
  refreshRepository(id: EntityId, input: VersionedMutationInput): Promise<CommandReceipt<ResourceRef>>;
  createAgent(input: CreateAgentInput): Promise<CommandReceipt<ResourceRef>>;
  updateAgent(id: EntityId, input: UpdateAgentInput): Promise<CommandReceipt<ResourceRef>>;
  setAgentEnabled(
    id: EntityId,
    input: VersionedMutationInput & { enabled: boolean },
  ): Promise<CommandReceipt<ResourceRef>>;
  restartAgent(id: EntityId, input: VersionedMutationInput): Promise<CommandReceipt<ResourceRef>>;
  resetAgentSession(id: EntityId, input: VersionedMutationInput): Promise<CommandReceipt<ResourceRef>>;
  fullResetAgent(id: EntityId, input: VersionedMutationInput): Promise<CommandReceipt<ResourceRef>>;
  markInboxRead(id: EntityId, input: VersionedMutationInput): Promise<CommandReceipt<ResourceRef>>;
  markAllInboxRead(input: MutationInput): Promise<CommandReceipt<ResourceRef | null>>;
  sendMessage(input: SendMessageInput): Promise<CommandReceipt<SendMessageResult>>;
  createTaskFromMessage(
    messageId: EntityId,
    input: MutationInput & { agentId: EntityId | null },
  ): Promise<CommandReceipt<ResourceRef>>;
  updateTask(taskId: EntityId, input: UpdateTaskInput): Promise<CommandReceipt<ResourceRef>>;
  startRun(input: StartRunInput): Promise<CommandReceipt<ResourceRef>>;
  cancelRun(runId: EntityId, input: VersionedMutationInput): Promise<CommandReceipt<ResourceRef>>;
  retryRun(runId: EntityId, input: VersionedMutationInput): Promise<CommandReceipt<ResourceRef>>;
  replyToRunInput(input: ReplyToRunInput): Promise<CommandReceipt<ResourceRef>>;
  approveChangeSet(id: EntityId, input: VersionedMutationInput): Promise<CommandReceipt<ResourceRef>>;
  rejectChangeSet(
    id: EntityId,
    input: VersionedMutationInput & { reason: string | null },
  ): Promise<CommandReceipt<ResourceRef>>;
  createDelivery(input: CreateDeliveryInput): Promise<CommandReceipt<ResourceRef>>;
  retryDelivery(
    id: EntityId,
    input: VersionedMutationInput & { targetIds: EntityId[] },
  ): Promise<CommandReceipt<ResourceRef>>;
  reconcileDelivery(id: EntityId, input: VersionedMutationInput): Promise<CommandReceipt<ResourceRef>>;
  createAutomation(input: CreateAutomationInput): Promise<CommandReceipt<ResourceRef>>;
  updateAutomation(id: EntityId, input: UpdateAutomationInput): Promise<CommandReceipt<ResourceRef>>;
  deleteAutomation(id: EntityId, input: VersionedMutationInput): Promise<CommandReceipt<ResourceRef>>;
  setAutomationEnabled(
    id: EntityId,
    input: VersionedMutationInput & { enabled: boolean },
  ): Promise<CommandReceipt<ResourceRef>>;
  runAutomationNow(id: EntityId, input: VersionedMutationInput): Promise<CommandReceipt<ResourceRef>>;
  addMemory(input: CreateMemoryInput): Promise<CommandReceipt<ResourceRef>>;
  setMemoryPinned(
    id: EntityId,
    input: VersionedMutationInput & { pinned: boolean },
  ): Promise<CommandReceipt<ResourceRef>>;
  deleteMemory(id: EntityId, input: VersionedMutationInput): Promise<CommandReceipt<ResourceRef>>;
  setComputerDraining(
    id: EntityId,
    input: VersionedMutationInput & { draining: boolean },
  ): Promise<CommandReceipt<ResourceRef>>;
  pairComputer(input: MutationInput): Promise<CommandReceipt<ComputerPairing>>;
  revokeComputer(id: EntityId, input: VersionedMutationInput): Promise<CommandReceipt<ResourceRef>>;
  createAttachmentUpload(input: CreateAttachmentUploadInput): Promise<CommandReceipt<AttachmentUploadGrant>>;
  completeAttachmentUpload(id: EntityId, input: CompleteAttachmentUploadInput): Promise<CommandReceipt<ResourceRef>>;
  deleteAttachment(id: EntityId, input: VersionedMutationInput): Promise<CommandReceipt<ResourceRef>>;
  search(query: string, page?: CursorQuery, signal?: AbortSignal): Promise<CursorPage<SearchResult>>;
  updateSettings(
    input: Partial<Omit<WorkspaceSettings, 'version'>> & VersionedMutationInput,
  ): Promise<CommandReceipt<ResourceRef>>;
}
