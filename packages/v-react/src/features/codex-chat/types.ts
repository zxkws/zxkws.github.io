export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export type ContextScope = 'session' | 'file' | 'project';

export type ContextItem = {
  id: string;
  scope: ContextScope;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ContextTemplate = {
  id: string;
  name: string;
  createdAt: string;
  items: Array<Pick<ContextItem, 'title' | 'content' | 'pinned'>>;
};

export type Attachment = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export type ToolCall = {
  id: string;
  type: 'code_interpreter' | 'file_search' | 'web_browsing' | 'custom';
  input: string;
  output?: string;
  createdAt: string;
};

export type MessageStatus = 'pending' | 'streaming' | 'completed' | 'error';

export type EnsembleMode = 'compare' | 'deliberate';

export type EnsembleViewMode = 'auto' | 'columns' | 'tabs';

export type EnsembleModelOutput = {
  modelRef: string;
  content: string;
  status: MessageStatus;
  startedAt?: string;
  latencyMs?: number;
  error?: string;
};

export type EnsembleFinalOutput = {
  modelRef: string;
  content: string;
  status: MessageStatus;
  startedAt?: string;
  latencyMs?: number;
  error?: string;
};

export type EnsembleState = {
  mode: EnsembleMode;
  viewMode: EnsembleViewMode;
  modelRefs: string[];
  outputs: EnsembleModelOutput[];
  final?: EnsembleFinalOutput;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  status?: MessageStatus;
  attachments?: Attachment[];
  toolCalls?: ToolCall[];
  ensemble?: EnsembleState;
};

export type ConversationSettings = {
  model: string;
  temperature: number;
  maxOutputTokens?: number | null;
  ensemble?: {
    enabled: boolean;
    modelRefs: string[];
    mode: EnsembleMode;
    judgeModelRef?: string | null;
    viewMode: EnsembleViewMode;
  };
};

export type ToolConfig = {
  codeInterpreter: boolean;
  fileSearch: boolean;
  webBrowsing: boolean;
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  settings: ConversationSettings;
  tools: ToolConfig;
  contextItems?: ContextItem[];
};

export type ChatStateSnapshot = {
  conversations: Conversation[];
  activeConversationId: string | null;
  fileContexts?: ContextItem[];
  projectContexts?: ContextItem[];
  contextTemplates?: ContextTemplate[];
  contextBudgetChars?: number;
};

export type ComposerAttachment = {
  id: string;
  file: File;
};

export type ChatRequest = {
  conversationId: string;
  settings: ConversationSettings;
  tools: ToolConfig;
  messages: ChatMessage[];
  attachments?: Attachment[];
  ensemble?: ConversationSettings['ensemble'];
  stream?: boolean;
};

export type ChatResponse = {
  message: {
    content: string;
    toolCalls?: ToolCall[];
    status?: MessageStatus;
  };
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  latencyMs?: number;
  cached?: boolean;
};
