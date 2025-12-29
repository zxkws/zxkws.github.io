import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

import Composer from './Composer';
import Sidebar from './Sidebar';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ContextPanel from './ContextPanel';
import WorkspacePanel, { type WorkspaceDiff, type WorkspaceCodeBlock } from './WorkspacePanel';
import { useChatState } from '../hooks/useChatState';
import type { ChatMessage, ComposerAttachment } from '../types';
import { ChatServiceError, createChatCompletion } from '../services/chatService';
import { buildContextPrompt } from '../utils/context';
import { extractCodeBlocks } from '../utils/markdown';
import { createId } from '../utils/storage';

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE_MB = 20;

export default function ChatWorkspace() {
  const {
    conversations,
    activeConversation,
    activeConversationId,
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
  } = useChatState();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [workspacePanelOpen, setWorkspacePanelOpen] = useState(false);
  const workspaceTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [workspaceCode, setWorkspaceCode] = useState('');
  const [workspaceLanguage, setWorkspaceLanguage] = useState('');
  const [workspaceHistory, setWorkspaceHistory] = useState<string[]>([]);
  const [workspaceDiff, setWorkspaceDiff] = useState<WorkspaceDiff | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceRefactoring, setWorkspaceRefactoring] = useState(false);
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const messages = useMemo(() => activeConversation?.messages ?? [], [activeConversation?.messages]);
  const workspaceBlocks = useMemo<WorkspaceCodeBlock[]>(() => {
    const blocks: WorkspaceCodeBlock[] = [];
    messages.forEach((message) => {
      extractCodeBlocks(message.content).forEach((block, index) => {
        if (!block.content.trim()) {
          return;
        }
        blocks.push({
          id: `${message.id}_${index}`,
          language: block.language,
          content: block.content,
          messageId: message.id,
          messageRole: message.role,
          createdAt: message.createdAt,
        });
      });
    });
    return blocks.reverse();
  }, [messages]);

  const handleCreateConversation = () => {
    createConversation();
    setDraft('');
    setAttachments([]);
    setSidebarMobileOpen(false);
  };

  const handleSelectConversation = (conversationId: string) => {
    selectConversation(conversationId);
    setSidebarMobileOpen(false);
  };

  const handleDeleteConversation = (conversationId: string) => {
    if (window.confirm('确定要删除该会话吗？')) {
      deleteConversation(conversationId);
    }
  };

  const handleUpload = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }
    const remainingSlots = MAX_ATTACHMENTS - attachments.length;
    if (remainingSlots <= 0) {
      setAttachmentError(`最多可附加 ${MAX_ATTACHMENTS} 个文件。`);
      return;
    }
    const selectedFiles = Array.from(fileList).slice(0, remainingSlots);
    const oversize = selectedFiles.find((file) => file.size > MAX_ATTACHMENT_SIZE_MB * 1024 * 1024);
    if (oversize) {
      setAttachmentError(`单个文件大小需小于 ${MAX_ATTACHMENT_SIZE_MB} MB。`);
      return;
    }
    const nextAttachments = selectedFiles.map((file) => ({ id: createId('att'), file }));
    setAttachments((prev) => [...prev, ...nextAttachments]);
    setAttachmentError(null);
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
  };

  const handleSend = async () => {
    if (!draft.trim()) {
      return;
    }
    const attachmentMetadata = attachments.map((item) => ({
      id: item.id,
      name: item.file.name,
      size: item.file.size,
      type: item.file.type,
    }));
    await sendMessage(draft, { attachments: attachmentMetadata });
    setDraft('');
    setAttachments([]);
  };

  const handleRegenerate = () => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
    if (!lastUserMessage) {
      return;
    }
    sendMessage(lastUserMessage.content, { attachments: lastUserMessage.attachments });
  };

  const handleModelChange = (modelId: string) => {
    if (!activeConversationId) {
      return;
    }
    updateSettings(activeConversationId, { model: modelId });
  };

  const handleTemperatureChange = (value: number) => {
    if (!activeConversationId) {
      return;
    }
    updateSettings(activeConversationId, { temperature: value });
  };

  const handleToggleTool = (tool: Parameters<typeof toggleTool>[1], value: boolean) => {
    if (!activeConversationId) {
      return;
    }
    toggleTool(activeConversationId, tool, value);
  };

  const handleDuplicate = () => {
    if (!activeConversationId) {
      return;
    }
    duplicateConversation(activeConversationId);
  };

  const handleClearConversation = () => {
    if (!activeConversationId) {
      return;
    }
    if (window.confirm('确定要清空当前会话的历史记录吗？')) {
      clearConversation(activeConversationId);
      setDraft('');
      setAttachments([]);
    }
  };

  const handleImportBlock = (blockId: string) => {
    const block = workspaceBlocks.find((item) => item.id === blockId);
    if (!block) {
      return;
    }
    setWorkspaceHistory((prev) => [...prev, workspaceCode]);
    setWorkspaceCode(block.content);
    setWorkspaceLanguage(block.language ?? '');
    setWorkspaceDiff(null);
    setWorkspaceError(null);
  };

  const handleRollbackWorkspace = () => {
    setWorkspaceHistory((prev) => {
      const last = prev[prev.length - 1];
      if (!last) {
        return prev;
      }
      setWorkspaceCode(last);
      return prev.slice(0, -1);
    });
  };

  const ensureConversationForWorkspace = () => {
    if (activeConversation) {
      return activeConversation;
    }
    return createConversation();
  };

  const handleRefactorSelection = async () => {
    const editor = workspaceTextareaRef.current;
    if (!editor) {
      return;
    }
    const start = Math.min(editor.selectionStart, editor.selectionEnd);
    const end = Math.max(editor.selectionStart, editor.selectionEnd);
    if (start === end) {
      setWorkspaceError('请先在工作区选中一段代码后再发起重构。');
      return;
    }

    const conversation = ensureConversationForWorkspace();
    const selected = workspaceCode.slice(start, end);
    if (!selected.trim()) {
      setWorkspaceError('当前选区内容为空，请重新选择。');
      return;
    }

    setWorkspaceRefactoring(true);
    setWorkspaceError(null);

    try {
      const contextResult = buildContextPrompt({
        itemsByScope: {
          session: conversation.contextItems ?? [],
          file: fileContexts,
          project: projectContexts,
        },
        budgetChars: contextBudgetChars,
      });

      const now = new Date();
      const promptLanguage = workspaceLanguage.trim() || 'text';
      const userPrompt = [
        '请只重构下面的代码片段，保持行为一致并尽量提升可读性/可维护性。',
        '要求：只返回一个 fenced code block，不要输出额外解释。',
        '',
        `\`\`\`${promptLanguage}`,
        selected.trim(),
        '```',
      ].join('\n');

      const systemMessage: ChatMessage | null = contextResult.prompt
        ? {
            id: createId('msg'),
            role: 'system',
            content: contextResult.prompt,
            createdAt: now.toISOString(),
            status: 'completed',
          }
        : null;

      const requestMessages: ChatMessage[] = [
        ...(systemMessage ? [systemMessage] : []),
        {
          id: createId('msg'),
          role: 'user',
          content: userPrompt,
          createdAt: new Date(now.getTime() + 1).toISOString(),
        },
      ];

      const response = await createChatCompletion(
        {
          conversationId: conversation.id,
          messages: requestMessages,
          settings: conversation.settings,
          tools: conversation.tools,
          attachments: [],
          stream: false,
        },
        {},
      );

      const blocks = extractCodeBlocks(response.message.content);
      const after = (blocks[0]?.content || response.message.content).trim();
      if (!after) {
        setWorkspaceError('未解析到可用的重构结果，请稍后重试。');
        return;
      }
      setWorkspaceDiff({
        before: selected,
        after,
        selectionStart: start,
        selectionEnd: end,
      });
    } catch (error) {
      const friendly = error instanceof ChatServiceError ? error.friendlyMessage : '重构请求失败，请稍后再试。';
      setWorkspaceError(friendly);
    } finally {
      setWorkspaceRefactoring(false);
    }
  };

  const handleApplyDiff = () => {
    if (!workspaceDiff) {
      return;
    }
    setWorkspaceHistory((prev) => [...prev, workspaceCode]);
    setWorkspaceCode(
      `${workspaceCode.slice(0, workspaceDiff.selectionStart)}${workspaceDiff.after}${workspaceCode.slice(workspaceDiff.selectionEnd)}`,
    );
    setWorkspaceDiff(null);
  };

  const layoutClass = clsx('cc-root', sidebarCollapsed && 'sidebar-collapsed');

  return (
    <div className={layoutClass}>
      {sidebarMobileOpen && <div className="sidebar-overlay" onClick={() => setSidebarMobileOpen(false)} />}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        collapsed={sidebarCollapsed}
        mobileOpen={sidebarMobileOpen}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        onMobileClose={() => setSidebarMobileOpen(false)}
        onSelectConversation={handleSelectConversation}
        onCreateConversation={handleCreateConversation}
        onRenameConversation={renameConversation}
        onDeleteConversation={handleDeleteConversation}
        onDuplicateConversation={duplicateConversation}
      />
      <main className="chat-area">
        <ChatHeader
          activeConversation={activeConversation ?? null}
          isGenerating={isGenerating}
          onNewConversation={handleCreateConversation}
          onDuplicateConversation={handleDuplicate}
          onClearConversation={handleClearConversation}
          onCancelGeneration={cancelGeneration}
          onToggleSidebar={() => setSidebarMobileOpen((prev) => !prev)}
          onToggleContextPanel={() =>
            setContextPanelOpen((prev) => {
              const next = !prev;
              if (next) {
                setWorkspacePanelOpen(false);
              }
              return next;
            })
          }
          onToggleWorkspacePanel={() =>
            setWorkspacePanelOpen((prev) => {
              const next = !prev;
              if (next) {
                setContextPanelOpen(false);
              }
              return next;
            })
          }
          onModelChange={handleModelChange}
          onTemperatureChange={handleTemperatureChange}
          onToggleTool={handleToggleTool}
        />
        <MessageList
          conversationId={activeConversationId}
          messages={messages}
          isGenerating={isGenerating}
          onRegenerate={handleRegenerate}
        />
        <Composer
          value={draft}
          attachments={attachments}
          isGenerating={isGenerating}
          disabled={isGenerating}
          errorMessage={attachmentError}
          onChange={setDraft}
          onSubmit={handleSend}
          onUpload={handleUpload}
          onRemoveAttachment={handleRemoveAttachment}
        />
      </main>
      <ContextPanel
        open={contextPanelOpen}
        sessionItems={sessionContextItems}
        fileItems={fileContexts}
        projectItems={projectContexts}
        templates={contextTemplates}
        budgetChars={contextBudgetChars}
        lastOmitted={lastContextOmitted ?? undefined}
        onClose={() => setContextPanelOpen(false)}
        onAddItem={addContextItem}
        onTogglePin={toggleContextPin}
        onDeleteItem={deleteContextItem}
        onSaveTemplate={saveContextTemplate}
        onApplyTemplate={applyContextTemplate}
        onDeleteTemplate={deleteContextTemplate}
      />
      <WorkspacePanel
        open={workspacePanelOpen}
        code={workspaceCode}
        language={workspaceLanguage}
        codeBlocks={workspaceBlocks}
        diff={workspaceDiff}
        isRefactoring={workspaceRefactoring}
        errorMessage={workspaceError}
        canRollback={workspaceHistory.length > 0}
        textareaRef={workspaceTextareaRef}
        onClose={() => setWorkspacePanelOpen(false)}
        onCodeChange={(value) => setWorkspaceCode(value)}
        onImportBlock={handleImportBlock}
        onRefactorSelection={handleRefactorSelection}
        onApplyDiff={handleApplyDiff}
        onClearDiff={() => setWorkspaceDiff(null)}
        onRollback={handleRollbackWorkspace}
      />
    </div>
  );
}
