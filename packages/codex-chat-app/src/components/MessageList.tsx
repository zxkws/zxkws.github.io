import { useEffect, useMemo, useRef } from 'react';
import clsx from 'clsx';

import type { ChatMessage } from '../types';
import Markdown from './Markdown';

const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path
      d="M4.2 4.2V2.8c0-.994 0-1.49.193-1.863a1.5 1.5 0 0 1 .644-.644C5.41.1 5.906.1 6.9.1h2.1c.994 0 1.49 0 1.863.193a1.5 1.5 0 0 1 .644.644C11.7 1.31 11.7 1.806 11.7 2.8v2.1c0 .994 0 1.49-.193 1.863a1.5 1.5 0 0 1-.644.644C10.39 7.6 9.894 7.6 8.9 7.6H6.8c-.994 0-1.49 0-1.863-.193a1.5 1.5 0 0 1-.644-.644C4.2 5.69 4.2 5.194 4.2 4.2Z"
      stroke="currentColor"
      strokeWidth="1.1"
      fill="none"
    />
    <path
      d="M2.8 13.9h2.1c.994 0 1.49 0 1.863-.193a1.5 1.5 0 0 0 .644-.644c.193-.373.193-.869.193-1.863V9.1c0-.994 0-1.49-.193-1.863a1.5 1.5 0 0 0-.644-.644C6.39 6.4 5.894 6.4 4.9 6.4H2.8c-.994 0-1.49 0-1.863.193a1.5 1.5 0 0 0-.644.644C0.1 7.61 0.1 8.106 0.1 9.1v2.1c0 .994 0 1.49.193 1.863.145.279.365.499.644.644.373.193.869.193 1.863.193Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
    />
  </svg>
);

const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M12.3 6.5A4.8 4.8 0 1 1 7 2.7" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path
      d="M8.5 1.2 11 2.1 10.1 4.6"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type MessageListProps = {
  messages: ChatMessage[];
  isGenerating: boolean;
  onRegenerate: () => void;
};

const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const formatTime = (iso: string) => {
  try {
    return timeFormatter.format(new Date(iso));
  } catch {
    return '';
  }
};

const isAssistant = (message: ChatMessage) => message.role === 'assistant';

export default function MessageList({ messages, isGenerating, onRegenerate }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const hasConversation = useMemo(() => messages.length > 0, [messages.length]);

  if (!hasConversation) {
    return (
      <div className="message-area">
        <div className="message-scroll" ref={scrollRef}>
          <div className="empty-state">
            <strong>准备好开始创作了吗？</strong>
            <span>输入提示词、上传附件或选择模板，即可体验类似 ChatGPT Codex 的高级对话功能。</span>
          </div>
        </div>
      </div>
    );
  }

  const lastAssistantMessage = [...messages].reverse().find(isAssistant);

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // ignore clipboard failure silently
    }
  };

  return (
    <div className="message-area">
      <div className="message-scroll" ref={scrollRef}>
        <div className="message-timeline">
          {messages.map((message) => {
            const isUser = message.role === 'user';
            const statusClass = message.status === 'error' ? 'message-status error' : 'message-status';
            return (
              <article key={message.id} className="message-card">
                <div className={clsx('message-avatar', isUser && 'user')}>{isUser ? '你' : 'AI'}</div>
                <div className={clsx('message-body', isUser && 'user')}>
                  <div className="message-header">
                    <span>
                      {isUser ? '用户' : 'Codex'} · {formatTime(message.createdAt)}
                    </span>
                    {message.status && (
                      <span className={statusClass}>
                        {message.status === 'pending' && '生成中…'}
                        {message.status === 'streaming' && '流式生成'}
                        {message.status === 'completed' && '已完成'}
                        {message.status === 'error' && '出现问题'}
                      </span>
                    )}
                  </div>
                  <div className="message-content">
                    <Markdown content={message.content} />
                  </div>

                  {message.attachments && message.attachments.length > 0 && (
                    <div className="attachment-preview">
                      {message.attachments.map((attachment) => (
                        <span key={attachment.id} className="attachment-pill">
                          {attachment.name}
                          <span className="hint-text">{(attachment.size / 1024).toFixed(1)} KB</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="tool-call">
                      {message.toolCalls.map((tool) => (
                        <div key={tool.id}>
                          <div className="tool-name">{tool.type === 'code_interpreter' ? '代码解释器' : tool.type}</div>
                          <div className="hint-text">输入</div>
                          <pre>{tool.input}</pre>
                          {tool.output && (
                            <>
                              <div className="hint-text">输出</div>
                              <pre>{tool.output}</pre>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="message-actions">
                    <button
                      type="button"
                      className="message-action-button"
                      onClick={() => copyToClipboard(message.content)}
                    >
                      <IconCopy /> 复制
                    </button>
                    {lastAssistantMessage?.id === message.id && !isGenerating && (
                      <button type="button" className="message-action-button" onClick={onRegenerate}>
                        <IconRefresh /> 重新生成
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
