import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Message, ProjectOverview, WorkspaceBootstrap } from '../domain';
import { useAgentWorkspaceClient, useMessages, useProjectOverview } from '../data/context';
import { MessageComposer } from '../components/MessageComposer';
import {
  ActionNotice,
  AgentAvatar,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Status,
} from '../components/Primitives';
import { ProjectTabs } from '../components/WorkspaceLayout';
import { workspacePath } from '../components/paths';
import { createMutationId, receiptEntityId } from '../components/mutations';
import { CursorPager } from '../components/CursorPager';

function MessageItem({
  message,
  snapshot,
  messages,
  projectId,
  onTask,
  onRun,
}: {
  message: Message;
  snapshot: WorkspaceBootstrap;
  messages: Message[];
  projectId: string;
  onTask: (message: Message) => void;
  onRun: (message: Message) => void;
}) {
  const agent = message.actorId ? snapshot.agents.find((item) => item.id === message.actorId) : null;
  const replies = messages.filter((item) => item.threadRootId === message.id);
  const author = message.actorType === 'owner' ? 'owner' : (agent?.handle ?? message.actorType);

  return (
    <article className={`aw-message${message.actorType === 'agent' ? ' aw-message--agent' : ''}`}>
      <header className="aw-message-header">
        <AgentAvatar name={author} />
        <div>
          <strong className="aw-message-author">{author}</strong>
          <div className="aw-message-meta">
            <span>{message.createdAt}</span>
            <Status value={message.status} />
            <span>{message.id}</span>
          </div>
        </div>
      </header>
      <div className="aw-message-body">{message.content}</div>
      <div className="aw-message-actions">
        {message.taskId ? (
          <Link className="aw-link" to={workspacePath(`/projects/${projectId}/tasks/${message.taskId}`)}>
            Task · {message.taskId}
          </Link>
        ) : (
          <button className="aw-button aw-button--ghost" type="button" onClick={() => onTask(message)}>
            As Task
          </button>
        )}
        {message.runId ? (
          <Link className="aw-link" to={workspacePath(`/projects/${projectId}/runs/${message.runId}`)}>
            Run · {message.runId}
          </Link>
        ) : (
          <button className="aw-button aw-button--ghost" type="button" onClick={() => onRun(message)}>
            启动 Run
          </button>
        )}
        {message.changeSetId && (
          <Link className="aw-link" to={workspacePath(`/projects/${projectId}/changes/${message.changeSetId}`)}>
            ChangeSet · {message.changeSetId}
          </Link>
        )}
      </div>
      {replies.length > 0 && (
        <div className="aw-thread-panel">
          <strong>{replies.length} replies</strong>
          {replies.map((reply) => (
            <div className="aw-message" key={reply.id}>
              <span className="aw-message-author">
                {reply.actorId
                  ? (snapshot.agents.find((item) => item.id === reply.actorId)?.handle ?? reply.actorType)
                  : reply.actorType}
              </span>
              <span className="aw-message-body">{reply.content}</span>
              <span className="aw-message-meta">{reply.createdAt}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export function ProjectChatPage({ snapshot, projectId }: { snapshot: WorkspaceBootstrap; projectId: string }) {
  const overviewQuery = useProjectOverview(projectId);
  if (overviewQuery.isPending) return <LoadingState />;
  if (overviewQuery.isError) {
    return <ErrorState error={overviewQuery.error} retry={() => void overviewQuery.refetch()} />;
  }
  return <ProjectChatContent snapshot={snapshot} overview={overviewQuery.data} />;
}

function ProjectChatContent({ snapshot, overview }: { snapshot: WorkspaceBootstrap; overview: ProjectOverview }) {
  const project = overview.project;
  const projectId = project.id;
  const conversation = overview.conversations.find((item) => item.projectId === projectId && item.type === 'project');
  if (!conversation) return <EmptyState title="Project Conversation 不存在" detail={projectId} />;
  return <ProjectConversation snapshot={snapshot} overview={overview} conversationId={conversation.id} />;
}

function ProjectConversation({
  snapshot,
  overview,
  conversationId,
}: {
  snapshot: WorkspaceBootstrap;
  overview: ProjectOverview;
  conversationId: string;
}) {
  const client = useAgentWorkspaceClient();
  const navigate = useNavigate();
  const project = overview.project;
  const projectId = project.id;
  const conversation = overview.conversations.find((item) => item.id === conversationId)!;
  const agents = overview.agents;
  const [cursor, setCursor] = useState<string | undefined>();
  const messagesQuery = useMessages(projectId, conversationId, { cursor, limit: 50 });
  const allMessages = messagesQuery.data?.items ?? [];
  const messages = allMessages.filter((message) => !message.threadRootId);
  const [notice, setNotice] = useState<string | null>(null);

  const createTask = async (message: Message) => {
    setNotice(null);
    try {
      const receipt = await client.createTaskFromMessage(message.id, {
        agentId: project.defaultAgentId,
        clientMutationId: createMutationId(),
      });
      const taskId = receiptEntityId(receipt);
      navigate(workspacePath(`/projects/${projectId}/tasks/${taskId}`));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  const startRun = async (message: Message) => {
    if (!project.defaultAgentId) {
      setNotice('defaultAgentId: null');
      return;
    }
    setNotice(null);
    try {
      const receipt = await client.startRun({
        projectId,
        taskId: message.taskId,
        agentId: project.defaultAgentId,
        triggerMessageId: message.id,
        clientMutationId: createMutationId(),
      });
      const runId = receiptEntityId(receipt);
      navigate(workspacePath(`/projects/${projectId}/runs/${runId}`));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <section className="aw-page">
      <PageHeader
        title={project.name}
        subtitle={
          <>
            conversationCursor: {conversation.headCursor} · conversationId: {conversation.id}
          </>
        }
      />
      <ProjectTabs projectId={projectId} />
      <ActionNotice message={notice} />
      <div className="aw-chat">
        <div className="aw-message-list" aria-live="polite">
          {messagesQuery.isPending ? (
            <LoadingState />
          ) : messagesQuery.isError ? (
            <ErrorState error={messagesQuery.error} retry={() => void messagesQuery.refetch()} />
          ) : messages.length === 0 ? (
            <EmptyState title="暂无消息" />
          ) : (
            messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                snapshot={snapshot}
                messages={allMessages}
                projectId={projectId}
                onTask={(item) => void createTask(item)}
                onRun={(item) => void startRun(item)}
              />
            ))
          )}
          {messagesQuery.data && <CursorPager page={messagesQuery.data} onCursor={setCursor} />}
        </div>
        <MessageComposer project={project} conversation={conversation} agents={agents} />
      </div>
    </section>
  );
}
