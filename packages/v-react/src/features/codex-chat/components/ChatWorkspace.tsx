import { useMemo, useState } from 'react';
import clsx from 'clsx';

import Composer from './Composer';
import Sidebar from './Sidebar';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import { useChatState } from '../hooks/useChatState';
import type { ComposerAttachment } from '../types';
import { createId } from '../utils/storage';

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_SIZE_MB = 20;

export default function ChatWorkspace() {
  const {
    conversations,
    activeConversation,
    activeConversationId,
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
  } = useChatState();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const messages = useMemo(() => activeConversation?.messages ?? [], [activeConversation?.messages]);

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
          onModelChange={handleModelChange}
          onTemperatureChange={handleTemperatureChange}
          onToggleTool={handleToggleTool}
        />
        <MessageList messages={messages} isGenerating={isGenerating} onRegenerate={handleRegenerate} />
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
    </div>
  );
}
