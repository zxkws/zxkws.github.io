import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  Attachment,
  ChatMessage,
  ChatStateSnapshot,
  Conversation,
  ConversationSettings,
  ToolConfig,
} from '../types';
import { DEFAULT_MODEL_ID } from '../constants/models';
import { createChatCompletion, createChatCompletionStream, ChatServiceError } from '../services/chatService';
import { createId, loadSnapshot, persistSnapshot } from '../utils/storage';

const DEFAULT_TITLE = '新对话';

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
  createConversation: (options?: Partial<Conversation>) => Conversation;
  selectConversation: (conversationId: string) => void;
  renameConversation: (conversationId: string, title: string) => void;
  deleteConversation: (conversationId: string) => void;
  duplicateConversation: (conversationId: string) => void;
  updateSettings: (conversationId: string, settings: Partial<ConversationSettings>) => void;
  toggleTool: (conversationId: string, key: keyof ToolConfig, value: boolean) => void;
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
  const [isGenerating, setIsGenerating] = useState(false);
  const pendingAssistantRef = useRef<{ conversationId: string; messageId: string } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  useEffect(() => {
    persistSnapshot({ conversations, activeConversationId });
  }, [conversations, activeConversationId]);

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
    setConversations((prev) =>
      updateConversationState(prev, pending.conversationId, (conversation) => ({
        ...conversation,
        messages: conversation.messages.map((message) =>
          message.id === pending.messageId
            ? {
                ...message,
                status: 'error',
                content: '已取消生成。',
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
      const assistantMessage: ChatMessage = {
        id: createId('msg'),
        role: 'assistant',
        content: '',
        createdAt: new Date(timestamp.getTime() + 1).toISOString(),
        status: 'pending',
      };

      setConversations((prev) =>
        updateConversationState(prev, conversationId, (target) => ({
          ...target,
          title: normalizeTitle(target, target.title, trimmed),
          updatedAt: assistantMessage.createdAt,
          messages: [...target.messages, userMessage, assistantMessage],
        })),
      );

      const payloadMessages = [...conversation.messages, userMessage];
      const payloadAttachments = options.attachments ?? [];

      const controller = new AbortController();
      abortControllerRef.current = controller;
      pendingAssistantRef.current = { conversationId, messageId: assistantMessage.id };
      setIsGenerating(true);

      try {
        let receivedDelta = false;
        let streamErrored = false;

        try {
          await createChatCompletionStream(
            {
              conversationId,
              messages: payloadMessages,
              settings: conversation.settings,
              tools: conversation.tools,
              attachments: payloadAttachments,
              stream: true,
            },
            {
              onMeta: () => {
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
              onDelta: (delta) => {
                receivedDelta = true;
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
              },
              onError: (message) => {
                streamErrored = true;
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
            return;
          }
          if (!receivedDelta && error instanceof ChatServiceError) {
            // 降级为非流式请求（兼容旧服务端/代理）
            const response = await createChatCompletion(
              {
                conversationId,
                messages: payloadMessages,
                settings: conversation.settings,
                tools: conversation.tools,
                attachments: payloadAttachments,
                stream: false,
              },
              { signal: controller.signal },
            );

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
    [activeConversation, createConversation, isGenerating],
  );

  return {
    conversations,
    activeConversationId,
    activeConversation,
    isGenerating,
    createConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
    duplicateConversation,
    updateSettings,
    toggleTool,
    sendMessage,
    cancelGeneration,
    clearConversation,
    clearAll,
  };
};
