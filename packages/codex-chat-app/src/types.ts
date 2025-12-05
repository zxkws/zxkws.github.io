export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

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

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  status?: MessageStatus;
  attachments?: Attachment[];
  toolCalls?: ToolCall[];
};

export type ConversationSettings = {
  model: string;
  temperature: number;
  maxOutputTokens?: number | null;
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
};

export type ChatStateSnapshot = {
  conversations: Conversation[];
  activeConversationId: string | null;
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
