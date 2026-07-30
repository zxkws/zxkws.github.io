import { useState } from 'react';
import type { Agent, Attachment, Conversation, Project } from '../domain';
import { useAgentWorkspaceClient } from '../data/context';
import { ActionNotice } from './Primitives';
import { createMutationId } from './mutations';
import { uploadAttachmentDirect } from '../data/attachment-upload';

export function MessageComposer({
  project,
  conversation,
  agents,
}: {
  project: Project;
  conversation: Conversation;
  agents: Agent[];
}) {
  const client = useAgentWorkspaceClient();
  const [content, setContent] = useState('');
  const [agentId, setAgentId] = useState(
    conversation.type === 'agent_dm' ? (conversation.agentIds[0] ?? '') : (project.defaultAgentId ?? ''),
  );
  const [asTask, setAsTask] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    setNotice(null);
    try {
      await client.sendMessage({
        projectId: project.id,
        conversationId: conversation.id,
        content,
        agentId: agentId || null,
        asTask,
        attachmentIds: attachments.map((attachment) => attachment.id),
        clientMutationId: createMutationId(),
      });
      setContent('');
      setAsTask(false);
      setAttachments([]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setNotice(null);
    try {
      for (const file of Array.from(files)) {
        const attachment = await uploadAttachmentDirect({
          client,
          projectId: project.id,
          file,
          idempotencyKeys: {
            createUploadIntent: createMutationId(),
            completeUpload: createMutationId(),
          },
        });
        setAttachments((current) => [...current, attachment]);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async (attachment: Attachment) => {
    setNotice(null);
    try {
      await client.deleteAttachment(attachment.id, {
        expectedVersion: attachment.version,
        clientMutationId: createMutationId(),
      });
      setAttachments((current) => current.filter((item) => item.id !== attachment.id));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="aw-composer">
      <ActionNotice message={notice} />
      <label className="aw-field">
        <span>消息</span>
        <textarea
          className="aw-textarea"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void submit();
          }}
          placeholder="发送消息或描述工作，⌘/Ctrl + Enter 提交"
          rows={4}
        />
      </label>
      <label className="aw-field">
        <span>attachments</span>
        <input
          className="aw-input"
          type="file"
          multiple
          disabled={uploading}
          onChange={(event) => {
            void uploadFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </label>
      {attachments.map((attachment) => (
        <div className="aw-list-item" key={attachment.id}>
          <span>{attachment.fileName}</span>
          <span>{attachment.contentType}</span>
          <span>{attachment.sizeBytes}</span>
          <span>{attachment.status}</span>
          <button
            className="aw-button aw-button--ghost"
            type="button"
            onClick={() => void removeAttachment(attachment)}
          >
            删除待发送附件
          </button>
        </div>
      ))}
      <div className="aw-composer-row">
        <label className="aw-field">
          <span>Agent</span>
          <select className="aw-select" value={agentId} onChange={(event) => setAgentId(event.target.value)}>
            <option value="">null</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.handle} · {agent.runtime} · {agent.status}
              </option>
            ))}
          </select>
        </label>
        <label className="aw-field aw-field--inline">
          <input type="checkbox" checked={asTask} onChange={(event) => setAsTask(event.target.checked)} />
          <span>As Task</span>
        </label>
        <button
          className="aw-button aw-button--primary"
          disabled={!content.trim() || submitting || uploading}
          onClick={submit}
        >
          {submitting ? '发送中…' : uploading ? '上传中…' : '发送'}
        </button>
      </div>
    </div>
  );
}
