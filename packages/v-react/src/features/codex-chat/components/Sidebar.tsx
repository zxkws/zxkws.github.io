import { useMemo, useState, type KeyboardEvent } from 'react';
import clsx from 'clsx';

import type { Conversation } from '../types';

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const formatDate = (input: string) => {
  try {
    return dateFormatter.format(new Date(input));
  } catch {
    return '';
  }
};

type SidebarProps = {
  conversations: Conversation[];
  activeConversationId: string | null;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onMobileClose: () => void;
  onSelectConversation: (conversationId: string) => void;
  onCreateConversation: () => void;
  onRenameConversation: (conversationId: string, title: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onDuplicateConversation: (conversationId: string) => void;
};

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M7 1.5v11m-5.5-5.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconMenu = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path d="M3 5h12m-12 4h9m-9 4h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path
      d="M8.828 2.172 2.5 8.5 2 11.5l3-.5 6.328-6.328a1.5 1.5 0 0 0 0-2.121l-.879-.879a1.5 1.5 0 0 0-2.121 0Z"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconDuplicate = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path
      d="M5 4.2V2.8c0-.994 0-1.49.193-1.863a1.5 1.5 0 0 1 .644-.644C6.21.1 6.706.1 7.7.1h2.1c.994 0 1.49 0 1.863.193a1.5 1.5 0 0 1 .644.644C12.5 1.31 12.5 1.806 12.5 2.8v2.1c0 .994 0 1.49-.193 1.863a1.5 1.5 0 0 1-.644.644c-.373.193-.869.193-1.863.193H7.7c-.994 0-1.49 0-1.863-.193a1.5 1.5 0 0 1-.644-.644C5 5.69 5 5.194 5 4.2Z"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
    />
    <path
      d="M2.8 13.9h2.1c.994 0 1.49 0 1.863-.193a1.5 1.5 0 0 0 .644-.644c.193-.373.193-.869.193-1.863V9.1c0-.994 0-1.49-.193-1.863a1.5 1.5 0 0 0-.644-.644C7.39 6.4 6.894 6.4 5.9 6.4H3.8c-.994 0-1.49 0-1.863.193a1.5 1.5 0 0 0-.644.644C1.1 7.61 1.1 8.106 1.1 9.1v2.1c0 .994 0 1.49.193 1.863.145.279.365.499.644.644.373.193.869.193 1.863.193Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    />
  </svg>
);

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M3.5 4.5h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path
      d="M5 4.5v5.5m2-5.5v5.5m2-8-.341-1.023A1 1 0 0 0 7.711.5H6.289a1 1 0 0 0-.948.977L5 2.5m6 0-.387 8.132c-.047.991-.07 1.486-.284 1.834a1.5 1.5 0 0 1-.63.561c-.34.173-.834.173-1.822.173H5.123c-.988 0-1.482 0-1.822-.173a1.5 1.5 0 0 1-.63-.561c-.214-.348-.237-.843-.284-1.834L2 2.5"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconChevron = ({ collapsed }: { collapsed: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path
      d={collapsed ? 'm7 4 4 5-4 5' : 'm11 4-4 5 4 5'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BrandMark = () => (
  <div className="brand">
    <span className="brand-logo">CX</span>
    <span className="brand-label">Codex</span>
  </div>
);

export default function Sidebar({
  conversations,
  activeConversationId,
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onMobileClose,
  onSelectConversation,
  onCreateConversation,
  onRenameConversation,
  onDeleteConversation,
  onDuplicateConversation,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const sortedConversations = useMemo(
    () => [...conversations].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [conversations],
  );

  const startEditing = (conversationId: string, title: string) => {
    setEditingId(conversationId);
    setDraftTitle(title);
  };

  const commitEditing = () => {
    if (!editingId) {
      return;
    }
    onRenameConversation(editingId, draftTitle);
    setEditingId(null);
    setDraftTitle('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitEditing();
    }
  };

  return (
    <aside className={clsx('sidebar', collapsed && 'collapsed', mobileOpen && 'is-open')} aria-label="会话导航">
      <div className="sidebar-header">
        <BrandMark />
        <div className="sidebar-actions">
          <button
            type="button"
            className="sidebar-action-button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
          >
            <IconChevron collapsed={collapsed} />
          </button>
          <button type="button" className="sidebar-action-button" onClick={onMobileClose} aria-label="关闭侧边栏">
            <IconMenu />
          </button>
        </div>
      </div>

      <button type="button" className="new-conversation-button" onClick={onCreateConversation}>
        <span className="icon">
          <IconPlus />
        </span>
        <span className="label">发起新对话</span>
      </button>

      <div className="sidebar-content">
        <section className="sidebar-section">
          <div className="sidebar-section-header">
            <span>最近会话</span>
            <span className="badge">实时同步</span>
          </div>
          <div className="conversation-list">
            {sortedConversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  className={clsx('conversation-item', isActive && 'active')}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className="title">
                    {editingId === conversation.id ? (
                      <input
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        onBlur={commitEditing}
                        onKeyDown={handleKeyDown}
                        autoFocus
                      />
                    ) : (
                      <span>{conversation.title}</span>
                    )}
                    <div className="sidebar-actions">
                      <button
                        type="button"
                        className="sidebar-action-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDuplicateConversation(conversation.id);
                        }}
                        aria-label="复制会话"
                      >
                        <IconDuplicate />
                      </button>
                      <button
                        type="button"
                        className="sidebar-action-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          startEditing(conversation.id, conversation.title);
                        }}
                        aria-label="重命名"
                      >
                        <IconEdit />
                      </button>
                      <button
                        type="button"
                        className="sidebar-action-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteConversation(conversation.id);
                        }}
                        aria-label="删除会话"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                  <div className="meta">
                    <span>{formatDate(conversation.updatedAt)}</span>
                    <span>
                      {conversation.settings.ensemble?.enabled
                        ? `Ensemble(${conversation.settings.ensemble.modelRefs?.length ?? 0})`
                        : conversation.settings.model}
                    </span>
                  </div>
                </button>
              );
            })}
            {sortedConversations.length === 0 && (
              <div className="empty-state">
                <strong>暂无会话</strong>
                <span>点击上方按钮创建第一个对话。</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}
