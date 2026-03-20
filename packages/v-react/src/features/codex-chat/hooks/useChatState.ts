import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  Attachment,
  ChatMessage,
  ContextItem,
  ContextScope,
  ContextTemplate,
  ChatStateSnapshot,
  Conversation,
  ConversationSettings,
  ToolConfig,
} from '../types';
import { DEFAULT_MODEL_ID } from '../constants/models';
import { createChatCompletion, createChatCompletionStream, ChatServiceError } from '../services/chatService';
import { buildContextPrompt, DEFAULT_CONTEXT_BUDGET_CHARS } from '../utils/context';
import { createId, loadSnapshot, persistSnapshot } from '../utils/storage';

const DEFAULT_TITLE = '新对话';

const nowMs = () => (typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now());

const safeTrack = (_type: string, _data: Record<string, unknown>) => {};

const createWelcomeConversation = (): Conversation => {
  const now = new Date();
  const nowIso = now.toISOString();
  const introMessage: ChatMessage = {
    id: createId('msg'),
    role: 'assistant',
    createdAt: nowIso,
    status: 'completed',
    content: `欢迎体验 **Codex 模型对话** ✨\n\n这个微应用旨在复刻 ChatGPT Codex 的常用工作流，支持多轮上下文、模型切换、工具组合以及对话管理。\n\n**你可以尝试：**\n- 上传文件并结合代码解释器完成数据分析\n- 切换到 \`o1\` 或 \`o4 Mini\` 体验更深入的推理能力\n- 通过提示模板快速搭建个人助理\n- 配合即将上线的服务端 API 获取真实模型响应\n\n下面演示了一个代码解释器的输出：\n\n\`\`\`python\nfor i in range(1, 4):\n    print(f"Codex demo #{i}")\n\`\`\``,
    toolCalls: [
      {
        id: createId('tool'),
        type: 'code_interpreter',
        input: 'for i in range(1, 4):\n    print("Codex demo #", i)',
        output: ['Codex demo #1', 'Codex demo #2', 'Codex demo #3'].join('\n'),
        createdAt: nowIso,
      },
    ],
  };

  return {
    id: createId('conv'),
    title: '欢迎体验 Codex',
    createdAt: nowIso,
    updatedAt: nowIso,
    messages: [introMessage],
    settings: {
      model: DEFAULT_MODEL_ID,
      temperature: 0.6,
      maxOutputTokens: null,
    },
    tools: {
      codeInterpreter: true,
      fileSearch: false,
      webBrowsing: false,
    },
  };
};

const createInitialSnapshot = (): ChatStateSnapshot => {
  const fallbackConversation = createWelcomeConversation();
  return {
    conversations: [fallbackConversation],
    activeConversationId: fallbackConversation.id,
    fileContexts: [],
    projectContexts: [],
    contextTemplates: [],
    contextBudgetChars: DEFAULT_CONTEXT_BUDGET_CHARS,
  };
};

const deriveTitleFromMessage = (content: string) => {
  const condensed = content.replace(/\s+/g, ' ').trim();
  if (!condensed) {
    return DEFAULT_TITLE;
  }
  const slice = condensed.slice(0, 36);
  return condensed.length > 36 ? `${slice}…` : slice;
};

const normalizeTitle = (conversation: Conversation, draftTitle: string, latestUserMessage: string) => {
  if (draftTitle && draftTitle !== DEFAULT_TITLE) {
    return draftTitle;
  }
  const hasUserHistory = conversation.messages.some((msg) => msg.role === 'user');
  if (hasUserHistory) {
    return conversation.title;
  }
  return deriveTitleFromMessage(latestUserMessage);
};

const updateConversationState = (
  conversations: Conversation[],
  conversationId: string,
  updater: (conversation: Conversation) => Conversation,
) => conversations.map((conversation) => (conversation.id === conversationId ? updater(conversation) : conversation));

type SendOptions = {
  attachments?: Attachment[];
};

type UseChatStateResult = {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  isGenerating: boolean;
  sessionContextItems: ContextItem[];
  fileContexts: ContextItem[];
  projectContexts: ContextItem[];
  contextTemplates: ContextTemplate[];
  contextBudgetChars: number;
  lastContextOmitted: number | null;
  createConversation: (options?: Partial<Conversation>) => Conversation;
  selectConversation: (conversationId: string) => void;
  renameConversation: (conversationId: string, title: string) => void;
  deleteConversation: (conversationId: string) => void;
  duplicateConversation: (conversationId: string) => void;
  updateSettings: (conversationId: string, settings: Partial<ConversationSettings>) => void;
  toggleTool: (conversationId: string, key: keyof ToolConfig, value: boolean) => void;
  addContextItem: (scope: ContextScope, title: string, content: string) => void;
  toggleContextPin: (scope: ContextScope, itemId: string) => void;
  deleteContextItem: (scope: ContextScope, itemId: string) => void;
  saveContextTemplate: (name: string) => void;
  applyContextTemplate: (templateId: string) => void;
  deleteContextTemplate: (templateId: string) => void;
  sendMessage: (content: string, options?: SendOptions) => Promise<void>;
  cancelGeneration: () => void;
  clearConversation: (conversationId: string) => void;
  clearAll: () => void;
};

export const useChatState = (): UseChatStateResult => {
  const [initialSnapshot] = useState<ChatStateSnapshot>(() => loadSnapshot() ?? createInitialSnapshot());

  const [conversations, setConversations] = useState<Conversation[]>(initialSnapshot.conversations);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialSnapshot.activeConversationId ?? initialSnapshot.conversations[0]?.id ?? null,
  );
  const [fileContexts, setFileContexts] = useState<ContextItem[]>(initialSnapshot.fileContexts ?? []);
  const [projectContexts, setProjectContexts] = useState<ContextItem[]>(initialSnapshot.projectContexts ?? []);
  const [contextTemplates, setContextTemplates] = useState<ContextTemplate[]>(initialSnapshot.contextTemplates ?? []);
  const [contextBudgetChars] = useState<number>(initialSnapshot.contextBudgetChars ?? DEFAULT_CONTEXT_BUDGET_CHARS);
  const [lastContextOmitted, setLastContextOmitted] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const pendingAssistantRef = useRef<{
    conversationId: string;
    messageId: string;
    model: string;
    startedAtMs: number;
    stream: boolean;
  } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const sessionContextItems = useMemo(() => activeConversation?.contextItems ?? [], [activeConversation?.contextItems]);

  useEffect(() => {
    persistSnapshot({
      conversations,
      activeConversationId,
      fileContexts,
      projectContexts,
      contextTemplates,
      contextBudgetChars,
    });
  }, [conversations, activeConversationId, contextBudgetChars, contextTemplates, fileContexts, projectContexts]);

  const selectConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
  }, []);

  const createConversation = useCallback((options: Partial<Conversation> = {}) => {
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: options.id ?? createId('conv'),
      title: options.title ?? DEFAULT_TITLE,
      createdAt: options.createdAt ?? now,
      updatedAt: options.updatedAt ?? now,
      messages: options.messages ?? [],
      contextItems: options.contextItems ?? [],
      settings: {
        model: options.settings?.model ?? DEFAULT_MODEL_ID,
        temperature: options.settings?.temperature ?? 0.6,
        maxOutputTokens: options.settings?.maxOutputTokens ?? null,
      },
      tools: {
        codeInterpreter: options.tools?.codeInterpreter ?? true,
        fileSearch: options.tools?.fileSearch ?? false,
        webBrowsing: options.tools?.webBrowsing ?? false,
      },
    };

    setConversations((prev) => [conversation, ...prev]);
    setActiveConversationId(conversation.id);
    return conversation;
  }, []);

  const renameConversation = useCallback((conversationId: string, title: string) => {
    setConversations((prev) =>
      updateConversationState(prev, conversationId, (conversation) => ({
        ...conversation,
        title: title.trim() ? title.trim() : DEFAULT_TITLE,
      })),
    );
  }, []);

  const deleteConversation = useCallback((conversationId: string) => {
    setConversations((prev) => {
      const next = prev.filter((conversation) => conversation.id !== conversationId);
      setActiveConversationId((current) => {
        if (current && current !== conversationId) {
          return current;
        }
        return next[0]?.id ?? null;
      });
      return next;
    });
  }, []);

  const duplicateConversation = useCallback(
    (conversationId: string) => {
      const source = conversations.find((conversation) => conversation.id === conversationId);
      if (!source) {
        return;
      }
      const now = new Date().toISOString();
      const clone: Conversation = {
        ...source,
        id: createId('conv'),
        title: `${source.title}（副本）`,
        createdAt: now,
        updatedAt: now,
        messages: source.messages.map((message) => ({
          ...message,
          id: createId('msg'),
        })),
        contextItems: (source.contextItems ?? []).map((item) => ({
          ...item,
          id: createId('ctx'),
          createdAt: now,
          updatedAt: now,
        })),
      };
      setConversations((prev) => [clone, ...prev]);
      setActiveConversationId(clone.id);
    },
    [conversations],
  );

  const updateSettings = useCallback((conversationId: string, settings: Partial<ConversationSettings>) => {
    setConversations((prev) =>
      updateConversationState(prev, conversationId, (conversation) => ({
        ...conversation,
        settings: { ...conversation.settings, ...settings },
      })),
    );
  }, []);

  const toggleTool = useCallback((conversationId: string, key: keyof ToolConfig, value: boolean) => {
    setConversations((prev) =>
      updateConversationState(prev, conversationId, (conversation) => ({
        ...conversation,
        tools: { ...conversation.tools, [key]: value },
      })),
    );
  }, []);

  const upsertSessionContextItems = useCallback((conversationId: string, updater: (items: ContextItem[]) => ContextItem[]) => {
    setConversations((prev) =>
      updateConversationState(prev, conversationId, (conversation) => {
        const nextItems = updater(conversation.contextItems ?? []);
        return {
          ...conversation,
          contextItems: nextItems,
        };
      }),
    );
  }, []);

  const addContextItem = useCallback(
    (scope: ContextScope, title: string, content: string) => {
      const nowIso = new Date().toISOString();
      const item: ContextItem = {
        id: createId('ctx'),
        scope,
        title: title.trim(),
        content: content.trim(),
        pinned: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      if (scope === 'session') {
        if (!activeConversationId) {
          createConversation({ contextItems: [item] });
          return;
        }
        upsertSessionContextItems(activeConversationId, (items) => [...items, item]);
        return;
      }
      if (scope === 'file') {
        setFileContexts((prev) => [...prev, item]);
        return;
      }
      setProjectContexts((prev) => [...prev, item]);
    },
    [activeConversationId, createConversation, upsertSessionContextItems],
  );

  const toggleContextPin = useCallback(
    (scope: ContextScope, itemId: string) => {
      const nowIso = new Date().toISOString();
      const toggleItem = (items: ContextItem[]) =>
        items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                pinned: !item.pinned,
                updatedAt: nowIso,
              }
            : item,
        );

      if (scope === 'session') {
        if (!activeConversationId) {
          return;
        }
        upsertSessionContextItems(activeConversationId, toggleItem);
        return;
      }
      if (scope === 'file') {
        setFileContexts(toggleItem);
        return;
      }
      setProjectContexts(toggleItem);
    },
    [activeConversationId, upsertSessionContextItems],
  );

  const deleteContextItem = useCallback(
    (scope: ContextScope, itemId: string) => {
      const removeItem = (items: ContextItem[]) => items.filter((item) => item.id !== itemId);
      if (scope === 'session') {
        if (!activeConversationId) {
          return;
        }
        upsertSessionContextItems(activeConversationId, removeItem);
        return;
      }
      if (scope === 'file') {
        setFileContexts(removeItem);
        return;
      }
      setProjectContexts(removeItem);
    },
    [activeConversationId, upsertSessionContextItems],
  );

  const saveContextTemplate = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || sessionContextItems.length === 0) {
        return;
      }
      const nowIso = new Date().toISOString();
      const template: ContextTemplate = {
        id: createId('tpl'),
        name: trimmed,
        createdAt: nowIso,
        items: sessionContextItems.map((item) => ({
          title: item.title,
          content: item.content,
          pinned: item.pinned,
        })),
      };
      setContextTemplates((prev) => [template, ...prev]);
    },
    [sessionContextItems],
  );

  const applyContextTemplate = useCallback(
    (templateId: string) => {
      const template = contextTemplates.find((item) => item.id === templateId);
      if (!template) {
        return;
      }
      const nowIso = new Date().toISOString();
      const nextItems: ContextItem[] = template.items.map((item) => ({
        id: createId('ctx'),
        scope: 'session',
        title: item.title,
        content: item.content,
        pinned: item.pinned,
        createdAt: nowIso,
        updatedAt: nowIso,
      }));

      if (!activeConversationId) {
        createConversation({ contextItems: nextItems });
        return;
      }
      upsertSessionContextItems(activeConversationId, () => nextItems);
    },
    [activeConversationId, contextTemplates, createConversation, upsertSessionContextItems],
  );

  const deleteContextTemplate = useCallback((templateId: string) => {
    setContextTemplates((prev) => prev.filter((item) => item.id !== templateId));
  }, []);

  const clearConversation = useCallback((conversationId: string) => {
    const timestamp = new Date().toISOString();
    setConversations((prev) =>
      updateConversationState(prev, conversationId, (conversation) => ({
        ...conversation,
        title: DEFAULT_TITLE,
        updatedAt: timestamp,
        messages: [],
      })),
    );
  }, []);

  const clearAll = useCallback(() => {
    const fresh = createInitialSnapshot();
    setConversations(fresh.conversations);
    setActiveConversationId(fresh.activeConversationId);
    setFileContexts(fresh.fileContexts ?? []);
    setProjectContexts(fresh.projectContexts ?? []);
    setContextTemplates(fresh.contextTemplates ?? []);
    setLastContextOmitted(null);
    persistSnapshot(fresh);
  }, []);

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    const pending = pendingAssistantRef.current;
    if (!pending) {
      return;
    }

    const elapsedMs = Math.max(0, Math.round(nowMs() - pending.startedAtMs));
    safeTrack('ai_cancel', { model: pending.model, stream: pending.stream });
    safeTrack('ai_total_ms', { ms: elapsedMs, model: pending.model, stream: pending.stream, status: 'cancel' });

    setConversations((prev) =>
      updateConversationState(prev, pending.conversationId, (conversation) => ({
        ...conversation,
        messages: conversation.messages.map((message) =>
          message.id === pending.messageId
            ? {
                ...message,
                status: 'error',
                content: '已取消生成。',
                ...(message.ensemble
                  ? {
                      ensemble: {
                        ...message.ensemble,
                        outputs: message.ensemble.outputs.map((output) => ({
                          ...output,
                          status: output.status === 'completed' ? output.status : 'error',
                          error: output.status === 'completed' ? output.error : '已取消生成。',
                        })),
                        final: message.ensemble.final
                          ? {
                              ...message.ensemble.final,
                              status: message.ensemble.final.status === 'completed' ? message.ensemble.final.status : 'error',
                              error: message.ensemble.final.status === 'completed' ? message.ensemble.final.error : '已取消生成。',
                            }
                          : undefined,
                      },
                    }
                  : {}),
              }
            : message,
        ),
      })),
    );
    pendingAssistantRef.current = null;
    setIsGenerating(false);
  }, []);

  const sendMessage = useCallback(
    async (content: string, options: SendOptions = {}) => {
      const trimmed = content.trim();
      if (!trimmed) {
        return;
      }
      if (isGenerating) {
        return;
      }

      let conversation = activeConversation;
      if (!conversation) {
        conversation = createConversation();
      }
      if (!conversation) {
        return;
      }

      const conversationId = conversation.id;
      const timestamp = new Date();
      const userMessage: ChatMessage = {
        id: createId('msg'),
        role: 'user',
        content: trimmed,
        createdAt: timestamp.toISOString(),
        attachments: options.attachments,
      };

      const ensembleSettings = conversation.settings.ensemble;
      const ensembleEnabled = Boolean(ensembleSettings?.enabled) && (ensembleSettings?.modelRefs?.length ?? 0) > 0;
      const ensembleModelRefs = ensembleEnabled ? ensembleSettings!.modelRefs.filter(Boolean) : [];
      const ensembleMode = ensembleSettings?.mode ?? 'compare';
      const ensembleViewMode = ensembleSettings?.viewMode ?? 'auto';
      const judgeModelRef = ensembleSettings?.judgeModelRef ?? null;

      const assistantMessage: ChatMessage = {
        id: createId('msg'),
        role: 'assistant',
        content: '',
        createdAt: new Date(timestamp.getTime() + 1).toISOString(),
        status: 'pending',
        ...(ensembleEnabled
          ? {
              ensemble: {
                mode: ensembleMode,
                viewMode: ensembleViewMode,
                modelRefs: ensembleModelRefs,
                outputs: ensembleModelRefs.map((modelRef) => ({
                  modelRef,
                  content: '',
                  status: 'pending',
                })),
                ...(ensembleMode === 'deliberate' && judgeModelRef
                  ? {
                      final: {
                        modelRef: judgeModelRef,
                        content: '',
                        status: 'pending',
                      },
                    }
                  : {}),
              },
            }
          : {}),
      };

      setConversations((prev) =>
        updateConversationState(prev, conversationId, (target) => ({
          ...target,
          title: normalizeTitle(target, target.title, trimmed),
          updatedAt: assistantMessage.createdAt,
          messages: [...target.messages, userMessage, assistantMessage],
        })),
      );

      const contextResult = buildContextPrompt({
        itemsByScope: {
          session: conversation.contextItems ?? [],
          file: fileContexts,
          project: projectContexts,
        },
        budgetChars: contextBudgetChars,
      });
      setLastContextOmitted(contextResult.omitted > 0 ? contextResult.omitted : null);

      const payloadMessages = [...conversation.messages, userMessage];
      const payloadMessagesWithContext = (() => {
        if (!contextResult.prompt) {
          return payloadMessages;
        }

        const systemMessage: ChatMessage = {
          id: createId('msg'),
          role: 'system',
          content: contextResult.prompt,
          createdAt: timestamp.toISOString(),
          status: 'completed',
        };

        const firstSystemIndex = payloadMessages.findIndex((msg) => msg.role === 'system');
        if (firstSystemIndex === -1) {
          return [systemMessage, ...payloadMessages];
        }

        return payloadMessages.map((msg, index) =>
          index === firstSystemIndex
            ? {
                ...msg,
                content: `${systemMessage.content}\n\n---\n\n${msg.content}`,
              }
            : msg,
        );
      })();
      const payloadAttachments = options.attachments ?? [];

      const startedAtMs = nowMs();
      const model = ensembleEnabled ? `ensemble(${ensembleModelRefs.length})` : conversation.settings.model;
      let metricStream = true;
      let trackedStreamConnect = false;
      let trackedFirstToken = false;
      let trackedTotal = false;

      const trackStreamConnect = () => {
        if (trackedStreamConnect || !metricStream) {
          return;
        }
        trackedStreamConnect = true;
        const elapsedMs = Math.max(0, Math.round(nowMs() - startedAtMs));
        safeTrack('stream_connect_ms', { ms: elapsedMs, model, stream: true });
      };

      const trackFirstToken = () => {
        if (trackedFirstToken) {
          return;
        }
        trackedFirstToken = true;
        const elapsedMs = Math.max(0, Math.round(nowMs() - startedAtMs));
        safeTrack('ai_first_token_ms', { ms: elapsedMs, model, stream: metricStream });
      };

      const trackTotal = (status: 'completed' | 'error') => {
        if (trackedTotal) {
          return;
        }
        trackedTotal = true;
        const elapsedMs = Math.max(0, Math.round(nowMs() - startedAtMs));
        safeTrack('ai_total_ms', { ms: elapsedMs, model, stream: metricStream, status });
      };

      const controller = new AbortController();
      abortControllerRef.current = controller;
      pendingAssistantRef.current = {
        conversationId,
        messageId: assistantMessage.id,
        model,
        startedAtMs,
        stream: metricStream,
      };
      setIsGenerating(true);

      try {
        let receivedDelta = false;
        let streamErrored = false;
        let deltaBuffer = '';
        const deltaBufferByModel = new Map<string, string>();
        let finalDeltaBuffer = '';
        let finalModelRef = '';
        let deltaFlushTimer: number | null = null;

        const flushBufferedDelta = () => {
          if (!ensembleEnabled) {
            if (!deltaBuffer) return;
            const delta = deltaBuffer;
            deltaBuffer = '';
            setConversations((prev) =>
              updateConversationState(prev, conversationId, (target) => ({
                ...target,
                updatedAt: new Date().toISOString(),
                messages: target.messages.map((message) =>
                  message.id === assistantMessage.id
                    ? {
                        ...message,
                        status: 'streaming',
                        content: `${message.content}${delta}`,
                      }
                    : message,
                ),
              })),
            );
            return;
          }

          if (deltaBufferByModel.size === 0 && !finalDeltaBuffer) {
            return;
          }

          const deltas = Array.from(deltaBufferByModel.entries());
          deltaBufferByModel.clear();
          const finalDelta = finalDeltaBuffer;
          finalDeltaBuffer = '';

          setConversations((prev) =>
            updateConversationState(prev, conversationId, (target) => ({
              ...target,
              updatedAt: new Date().toISOString(),
              messages: target.messages.map((message) => {
                if (message.id !== assistantMessage.id) return message;
                const ensemble = message.ensemble;
                if (!ensemble) return message;
                const outputs = ensemble.outputs.map((output) => {
                  const delta = deltas.find(([ref]) => ref === output.modelRef)?.[1] ?? '';
                  if (!delta) return output;
                  return {
                    ...output,
                    status: 'streaming' as const,
                    content: `${output.content}${delta}`,
                  };
                });

                const final = (() => {
                  if (!finalDelta) return ensemble.final;
                  const ref = finalModelRef || ensemble.final?.modelRef || '';
                  if (!ref) return ensemble.final;
                  const current = ensemble.final ?? { modelRef: ref, content: '', status: 'pending' as const };
                  return {
                    ...current,
                    modelRef: ref,
                    status: 'streaming' as const,
                    content: `${current.content}${finalDelta}`,
                  };
                })();

                return {
                  ...message,
                  status: 'streaming',
                  ensemble: {
                    ...ensemble,
                    outputs,
                    final,
                  },
                };
              }),
            })),
          );
        };

        const scheduleDeltaFlush = () => {
          if (deltaFlushTimer !== null) {
            return;
          }
          if (typeof window === 'undefined') {
            flushBufferedDelta();
            return;
          }
          deltaFlushTimer = window.setTimeout(() => {
            deltaFlushTimer = null;
            flushBufferedDelta();
          }, 50);
        };

        const cancelDeltaFlush = () => {
          if (deltaFlushTimer === null || typeof window === 'undefined') {
            deltaFlushTimer = null;
            return;
          }
          window.clearTimeout(deltaFlushTimer);
          deltaFlushTimer = null;
        };

        try {
          await createChatCompletionStream(
            {
              conversationId,
              messages: payloadMessagesWithContext,
              settings: conversation.settings,
              tools: conversation.tools,
              attachments: payloadAttachments,
              ensemble: ensembleSettings,
              stream: true,
            },
            {
              onMeta: () => {
                trackStreamConnect();
                setConversations((prev) =>
                  updateConversationState(prev, conversationId, (target) => ({
                    ...target,
                    updatedAt: new Date().toISOString(),
                    messages: target.messages.map((message) =>
                      message.id === assistantMessage.id
                        ? {
                            ...message,
                            status: 'streaming',
                          }
                        : message,
                    ),
                  })),
                );
              },
              onModelDelta: (modelRef, delta) => {
                receivedDelta = true;
                trackStreamConnect();
                trackFirstToken();
                if (!ensembleEnabled) {
                  deltaBuffer += delta;
                  scheduleDeltaFlush();
                  return;
                }
                const prevDelta = deltaBufferByModel.get(modelRef) ?? '';
                deltaBufferByModel.set(modelRef, `${prevDelta}${delta}`);
                scheduleDeltaFlush();
              },
              onDelta: (delta) => {
                // 兼容旧协议
                receivedDelta = true;
                trackStreamConnect();
                trackFirstToken();
                if (ensembleEnabled) {
                  const modelRef = ensembleModelRefs[0] ?? '';
                  if (!modelRef) return;
                  const prevDelta = deltaBufferByModel.get(modelRef) ?? '';
                  deltaBufferByModel.set(modelRef, `${prevDelta}${delta}`);
                  scheduleDeltaFlush();
                  return;
                }
                deltaBuffer += delta;
                scheduleDeltaFlush();
              },
              onModelDone: (modelRef, data) => {
                setConversations((prev) =>
                  updateConversationState(prev, conversationId, (target) => ({
                    ...target,
                    updatedAt: new Date().toISOString(),
                    messages: target.messages.map((message) => {
                      if (message.id !== assistantMessage.id) return message;
                      if (!message.ensemble) return message;
                      const record = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null;
                      const latencyMs = typeof record?.latencyMs === 'number' ? record.latencyMs : undefined;
                      return {
                        ...message,
                        ensemble: {
                          ...message.ensemble,
                          outputs: message.ensemble.outputs.map((output) =>
                            output.modelRef === modelRef
                              ? { ...output, status: 'completed', latencyMs }
                              : output,
                          ),
                        },
                      };
                    }),
                  })),
                );
              },
              onModelError: (modelRef, message) => {
                setConversations((prev) =>
                  updateConversationState(prev, conversationId, (target) => ({
                    ...target,
                    updatedAt: new Date().toISOString(),
                    messages: target.messages.map((item) => {
                      if (item.id !== assistantMessage.id) return item;
                      if (!item.ensemble) {
                        return {
                          ...item,
                          status: 'error',
                          content: message,
                        };
                      }
                      return {
                        ...item,
                        ensemble: {
                          ...item.ensemble,
                          outputs: item.ensemble.outputs.map((output) =>
                            output.modelRef === modelRef
                              ? { ...output, status: 'error', error: message }
                              : output,
                          ),
                        },
                      };
                    }),
                  })),
                );
              },
              onFinalDelta: (modelRef, delta) => {
                receivedDelta = true;
                trackStreamConnect();
                trackFirstToken();
                finalModelRef = modelRef;
                finalDeltaBuffer += delta;
                scheduleDeltaFlush();
              },
              onFinalDone: (modelRef, data) => {
                cancelDeltaFlush();
                flushBufferedDelta();
                const record = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null;
                const latencyMs = typeof record?.latencyMs === 'number' ? record.latencyMs : undefined;
                const content = typeof record?.content === 'string' ? String(record.content) : '';
                setConversations((prev) =>
                  updateConversationState(prev, conversationId, (target) => ({
                    ...target,
                    updatedAt: new Date().toISOString(),
                    messages: target.messages.map((message) => {
                      if (message.id !== assistantMessage.id) return message;
                      if (!message.ensemble) return message;
                      return {
                        ...message,
                        ensemble: {
                          ...message.ensemble,
                          final: {
                            modelRef,
                            status: 'completed',
                            latencyMs,
                            content: content || message.ensemble.final?.content || '',
                          },
                        },
                      };
                    }),
                  })),
                );
              },
              onError: (message) => {
                streamErrored = true;
                safeTrack('ai_error', { model, stream: true, code: 'stream_error_event' });
                trackTotal('error');
                cancelDeltaFlush();
                flushBufferedDelta();
                setConversations((prev) =>
                  updateConversationState(prev, conversationId, (target) => ({
                    ...target,
                    updatedAt: new Date().toISOString(),
                    messages: target.messages.map((item) =>
                      item.id === assistantMessage.id
                        ? {
                            ...item,
                            status: 'error',
                            content: message,
                            ...(item.ensemble
                              ? {
                                  ensemble: {
                                    ...item.ensemble,
                                    outputs: item.ensemble.outputs.map((output) => ({
                                      ...output,
                                      status: output.status === 'completed' ? output.status : 'error',
                                      error: output.status === 'completed' ? output.error : message,
                                    })),
                                    final: item.ensemble.final
                                      ? {
                                          ...item.ensemble.final,
                                          status: item.ensemble.final.status === 'completed' ? item.ensemble.final.status : 'error',
                                          error: item.ensemble.final.status === 'completed' ? item.ensemble.final.error : message,
                                        }
                                      : undefined,
                                  },
                                }
                              : {}),
                          }
                        : item,
                    ),
                  })),
                );
              },
              onDone: () => {
                if (streamErrored) {
                  return;
                }
                cancelDeltaFlush();
                flushBufferedDelta();
                trackTotal('completed');
                setConversations((prev) =>
                  updateConversationState(prev, conversationId, (target) => ({
                    ...target,
                    updatedAt: new Date().toISOString(),
                    messages: target.messages.map((item) =>
                      item.id === assistantMessage.id
                        ? {
                            ...item,
                            status: 'completed',
                          }
                        : item,
                    ),
                  })),
                );
              },
            },
            { signal: controller.signal },
          );
          return;
        } catch (error) {
          if ((error as DOMException)?.name === 'AbortError') {
            // 已在 cancelGeneration 中处理
            cancelDeltaFlush();
            deltaBuffer = '';
            return;
          }
          cancelDeltaFlush();
          flushBufferedDelta();
          if (!ensembleEnabled && !receivedDelta && error instanceof ChatServiceError) {
            // 降级为非流式请求（兼容旧服务端/代理）
            metricStream = false;
            if (pendingAssistantRef.current) {
              pendingAssistantRef.current.stream = false;
            }
            const response = await createChatCompletion(
              {
                conversationId,
                messages: payloadMessagesWithContext,
                settings: conversation.settings,
                tools: conversation.tools,
                attachments: payloadAttachments,
                stream: false,
              },
              { signal: controller.signal },
            );

            trackFirstToken();
            trackTotal('completed');

            setConversations((prev) =>
              updateConversationState(prev, conversationId, (target) => ({
                ...target,
                updatedAt: new Date().toISOString(),
                messages: target.messages.map((message) =>
                  message.id === assistantMessage.id
                    ? {
                        ...message,
                        content: response.message.content,
                        toolCalls: response.message.toolCalls,
                        status: response.message.status ?? 'completed',
                      }
                    : message,
                ),
              })),
            );
            return;
          }
          if (receivedDelta) {
            const friendlyMessage =
              error instanceof ChatServiceError ? error.friendlyMessage : '流式生成连接中断，请稍后重试。';
            safeTrack('ai_error', {
              model,
              stream: true,
              code: error instanceof ChatServiceError ? error.code : 'UNEXPECTED',
            });
            trackTotal('error');
            setConversations((prev) =>
              updateConversationState(prev, conversationId, (target) => ({
                ...target,
                updatedAt: new Date().toISOString(),
                messages: target.messages.map((item) =>
                  item.id === assistantMessage.id
                    ? {
                        ...item,
                        status: 'error',
                        content: `${item.content}\n\n${friendlyMessage}`,
                      }
                    : item,
                ),
              })),
            );
            return;
          }
          throw error;
        }
      } catch (error) {
        if ((error as DOMException)?.name === 'AbortError') {
          // 已在 cancelGeneration 中处理
          return;
        }
        safeTrack('ai_error', {
          model,
          stream: metricStream,
          code: error instanceof ChatServiceError ? error.code : 'UNEXPECTED',
        });
        trackTotal('error');
        const friendlyMessage =
          error instanceof ChatServiceError ? error.friendlyMessage : '暂时无法获取模型响应，请稍后再试。';
        setConversations((prev) =>
          updateConversationState(prev, conversationId, (target) => ({
            ...target,
            messages: target.messages.map((message) =>
              message.id === assistantMessage.id
                ? {
                    ...message,
                    status: 'error',
                    content: friendlyMessage,
                  }
                : message,
            ),
          })),
        );
      } finally {
        pendingAssistantRef.current = null;
        abortControllerRef.current = null;
        setIsGenerating(false);
      }
    },
    [activeConversation, contextBudgetChars, createConversation, fileContexts, isGenerating, projectContexts],
  );

  return {
    conversations,
    activeConversationId,
    activeConversation,
    isGenerating,
    sessionContextItems,
    fileContexts,
    projectContexts,
    contextTemplates,
    contextBudgetChars,
    lastContextOmitted,
    createConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
    duplicateConversation,
    updateSettings,
    toggleTool,
    addContextItem,
    toggleContextPin,
    deleteContextItem,
    saveContextTemplate,
    applyContextTemplate,
    deleteContextTemplate,
    sendMessage,
    cancelGeneration,
    clearConversation,
    clearAll,
  };
};
