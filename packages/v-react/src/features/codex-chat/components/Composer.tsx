import { useEffect, useRef, type KeyboardEvent } from 'react';
import clsx from 'clsx';

import type { ComposerAttachment } from '../types';

const IconUpload = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M3 10.5v1.4c0 .56 0 .84.11 1.054a1 1 0 0 0 .436.436c.214.11.494.11 1.054.11h6.8c.56 0 .84 0 1.054-.11a1 1 0 0 0 .436-.436c.11-.214.11-.494.11-1.054v-1.4"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M8 9.5V2.2m0 0L5.5 4.7m2.5-2.5L10.5 4.7"
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconLightning = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <path
      d="M6.1 1.2 2.7 7.1c-.226.396-.34.595-.29.743.043.128.172.214.454.214H6l-.6 4.4 5.9-6.9c.226-.264.34-.396.29-.544-.043-.128-.172-.214-.454-.214H8l.6-4.4-2.5 2.943Z"
      fill="currentColor"
    />
  </svg>
);

type ComposerProps = {
  value: string;
  attachments: ComposerAttachment[];
  disabled?: boolean;
  isGenerating: boolean;
  errorMessage?: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onUpload: (files: FileList | null) => void;
  onRemoveAttachment: (attachmentId: string) => void;
};

export default function Composer({
  value,
  attachments,
  disabled,
  isGenerating,
  errorMessage,
  onChange,
  onSubmit,
  onUpload,
  onRemoveAttachment,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, [value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!disabled && value.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <div className="composer-shell">
      <div className="composer" role="form" aria-label="提示词输入区">
        {errorMessage && <div className="alert warning">{errorMessage}</div>}
        {attachments.length > 0 && (
          <div className="attachment-preview">
            {attachments.map((attachment) => (
              <span key={attachment.id} className="attachment-pill">
                {attachment.file.name}
                <span className="hint-text">{(attachment.file.size / 1024).toFixed(1)} KB</span>
                <button type="button" onClick={() => onRemoveAttachment(attachment.id)} aria-label="移除附件">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isGenerating ? '正在等待模型响应…' : '提出需求、添加上下文或描述你想要的结果'}
          aria-label="输入提示词"
          disabled={disabled}
        />

        <div className="composer-toolbar">
          <div className="composer-left">
            <input
              ref={fileInputRef}
              type="file"
              hidden
              multiple
              onChange={(event) => {
                onUpload(event.target.files);
                if (event.target) {
                  event.target.value = '';
                }
              }}
            />
            <button
              type="button"
              className="icon-button"
              onClick={() => fileInputRef.current?.click()}
              title="上传文件"
              aria-label="上传文件"
              disabled={disabled}
            >
              <IconUpload />
            </button>
            <span className="hint-text">支持代码解释器与文件检索</span>
          </div>
          <div className="composer-right">
            <span className="hint-text">Shift + Enter 换行</span>
            <button
              type="button"
              className={clsx('send-button')}
              onClick={onSubmit}
              disabled={disabled || !value.trim()}
            >
              <IconLightning /> 发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
