import { useEffect, useRef, useState } from 'react';
import {
  assistantApi,
  knowledgeApi,
  type Assistant,
  type Conversation,
  type Memory,
  type Message,
  type Model,
  type Voice,
  type KnowledgeBase,
} from './api';
import './styles.css';

type Tab = 'role' | 'model' | 'memory' | 'extensions';

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export default function AssistantsApp() {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<Assistant | null>(null);
  const [chatting, setChatting] = useState<Assistant | null>(null);
  const [tab, setTab] = useState<Tab>('role');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoryText, setMemoryText] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setStatus('');
    try {
      const [assistantList, voiceList] = await Promise.all([assistantApi.list(), assistantApi.voices()]);
      setAssistants(assistantList);
      setVoices(voiceList);
    } catch (error) {
      setStatus(errorText(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    if (!newName) return;
    try {
      const created = await assistantApi.create(newName);
      setAssistants((items) => [created, ...items]);
      setCreating(false);
      setNewName('');
      setEditing(created);
    } catch (error) {
      setStatus(errorText(error));
    }
  };

  const openConfig = async (assistant: Assistant) => {
    setEditing(assistant);
    setTab('role');
    setMemories([]);
    if (!models.length)
      assistantApi
        .models()
        .then(setModels)
        .catch((error) => setStatus(errorText(error)));
    if (!knowledgeBases.length)
      knowledgeApi
        .list()
        .then(setKnowledgeBases)
        .catch((error) => setStatus(errorText(error)));
  };

  const save = async () => {
    if (!editing) return;
    setLoading(true);
    try {
      const saved = await assistantApi.update(editing.id, editing);
      setAssistants((items) => items.map((item) => (item.id === saved.id ? saved : item)));
      setEditing(null);
      setStatus('保存成功');
    } catch (error) {
      setStatus(errorText(error));
    } finally {
      setLoading(false);
    }
  };

  const removeAssistant = async (assistant: Assistant) => {
    if (!window.confirm(`删除智能体“${assistant.name}”？`)) return;
    try {
      await assistantApi.remove(assistant.id);
      setAssistants((items) => items.filter((item) => item.id !== assistant.id));
    } catch (error) {
      setStatus(errorText(error));
    }
  };

  const loadMemories = async () => {
    if (!editing) return;
    try {
      setMemories(await assistantApi.memories(editing.id));
    } catch (error) {
      setStatus(errorText(error));
    }
  };

  useEffect(() => {
    if (editing && tab === 'memory') loadMemories();
  }, [editing?.id, tab]);

  const addMemory = async () => {
    if (!editing || !memoryText) return;
    try {
      const memory = await assistantApi.addMemory(editing.id, memoryText);
      setMemories((items) => [memory, ...items]);
      setMemoryText('');
    } catch (error) {
      setStatus(errorText(error));
    }
  };

  const removeMemory = async (memory: Memory) => {
    if (!editing) return;
    setStatus('');
    try {
      await assistantApi.removeMemory(editing.id, memory.id);
      setMemories((items) => items.filter((item) => item.id !== memory.id));
    } catch (error) {
      setStatus(errorText(error));
    }
  };

  const updateEditing = <K extends keyof Assistant>(key: K, value: Assistant[K]) => {
    setEditing((current) => (current ? { ...current, [key]: value } : current));
  };

  return (
    <main className="assistants-root">
      <header className="assistants-header">
        <div>
          <h1>语音助手</h1>
          <p>共 {assistants.length} 个智能体</p>
        </div>
        <button className="primary" onClick={() => setCreating(true)}>
          新建智能体
        </button>
      </header>

      {status && (
        <p className="assistants-status" role="status">
          {status}
        </p>
      )}
      <div className="assistant-grid">
        {assistants.map((assistant) => (
          <article className="assistant-card" key={assistant.id}>
            <div className="assistant-card-title">
              <h2>{assistant.name}</h2>
              <button className="danger-link" onClick={() => removeAssistant(assistant)}>
                删除
              </button>
            </div>
            <dl>
              <div>
                <dt>助手称呼</dt>
                <dd>{assistant.assistantName}</dd>
              </div>
              <div>
                <dt>模型</dt>
                <dd>{assistant.llmModel}</dd>
              </div>
              <div>
                <dt>音色</dt>
                <dd>{assistant.voiceId}</dd>
              </div>
            </dl>
            <div className="assistant-card-actions">
              <button onClick={() => openConfig(assistant)}>配置</button>
              <button className="primary" onClick={() => setChatting(assistant)}>
                对话
              </button>
            </div>
          </article>
        ))}
        {!assistants.length && <div className="assistant-empty">{loading ? '正在加载智能体…' : '暂无智能体'}</div>}
      </div>

      {creating && (
        <div className="assistant-modal-mask">
          <section className="assistant-modal create-modal">
            <header>
              <h2>新建智能体</h2>
              <button onClick={() => setCreating(false)}>×</button>
            </header>
            <div className="assistant-modal-body">
              <label className="create-field">
                <span>名称</span>
                <input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} />
              </label>
            </div>
            <footer>
              <button onClick={() => setCreating(false)}>取消</button>
              <button className="primary" disabled={!newName} onClick={create}>
                创建
              </button>
            </footer>
          </section>
        </div>
      )}

      {editing && (
        <div className="assistant-modal-mask">
          <section className="assistant-modal">
            <header>
              <h2>{editing.name} · 配置</h2>
              <button onClick={() => setEditing(null)}>×</button>
            </header>
            <nav>
              {(
                [
                  ['role', '角色与音色'],
                  ['model', '模型'],
                  ['memory', '记忆'],
                  ['extensions', '扩展能力'],
                ] as Array<[Tab, string]>
              ).map(([key, label]) => (
                <button className={tab === key ? 'active' : ''} key={key} onClick={() => setTab(key)}>
                  {label}
                </button>
              ))}
            </nav>
            <div className="assistant-modal-body">
              {tab === 'role' && (
                <div className="assistant-form-grid">
                  <label>
                    <span>名称</span>
                    <input value={editing.name} onChange={(e) => updateEditing('name', e.target.value)} />
                  </label>
                  <label>
                    <span>语言</span>
                    <input value={editing.language} onChange={(e) => updateEditing('language', e.target.value)} />
                  </label>
                  <label>
                    <span>助手称呼</span>
                    <input
                      value={editing.assistantName}
                      onChange={(e) => updateEditing('assistantName', e.target.value)}
                    />
                  </label>
                  <label>
                    <span>用户称呼</span>
                    <input value={editing.userName} onChange={(e) => updateEditing('userName', e.target.value)} />
                  </label>
                  <label className="wide">
                    <span>音色</span>
                    <select value={editing.voiceId} onChange={(e) => updateEditing('voiceId', e.target.value)}>
                      {voices.map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>回复速度</span>
                    <select value={editing.speechSpeed} onChange={(e) => updateEditing('speechSpeed', e.target.value)}>
                      <option value="slow">slow</option>
                      <option value="standard">standard</option>
                      <option value="fast">fast</option>
                    </select>
                  </label>
                  <label>
                    <span>识别速度</span>
                    <select
                      value={editing.recognitionSpeed}
                      onChange={(e) => updateEditing('recognitionSpeed', e.target.value)}
                    >
                      <option value="slow">slow</option>
                      <option value="standard">standard</option>
                      <option value="fast">fast</option>
                    </select>
                  </label>
                  <label className="wide">
                    <span>回复音调：{editing.pitch}</span>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.1"
                      value={editing.pitch}
                      onChange={(e) => updateEditing('pitch', Number(e.target.value))}
                    />
                  </label>
                  <label className="wide">
                    <span>角色介绍</span>
                    <textarea
                      rows={12}
                      value={editing.character ?? ''}
                      onChange={(e) => updateEditing('character', e.target.value)}
                    />
                  </label>
                </div>
              )}
              {tab === 'model' && (
                <div className="assistant-form-grid">
                  <label className="wide">
                    <span>语言模型</span>
                    <select value={editing.llmModel ?? ''} onChange={(e) => updateEditing('llmModel', e.target.value)}>
                      <option value="">平台默认文本模型</option>
                      {editing.llmModel && !models.some((model) => model.id === editing.llmModel) && (
                        <option value={editing.llmModel}>{editing.llmModel}</option>
                      )}
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>上下文消息数量</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={editing.maxMessageCount}
                      onChange={(e) => updateEditing('maxMessageCount', Number(e.target.value))}
                    />
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={editing.teenMode}
                      onChange={(e) => updateEditing('teenMode', e.target.checked)}
                    />
                    <span>未成年人模式</span>
                  </label>
                </div>
              )}
              {tab === 'memory' && (
                <div>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={editing.longMemoryEnabled}
                      onChange={(e) => updateEditing('longMemoryEnabled', e.target.checked)}
                    />
                    <span>启用长期记忆</span>
                  </label>
                  <div className="memory-add">
                    <input value={memoryText} onChange={(e) => setMemoryText(e.target.value)} placeholder="新增记忆" />
                    <button onClick={addMemory}>添加</button>
                  </div>
                  <ul className="memory-list">
                    {memories.map((memory) => (
                      <li key={memory.id}>
                        <span>{memory.content}</span>
                        <button onClick={() => void removeMemory(memory)}>删除</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {tab === 'extensions' && (
                <div className="assistant-form-grid">
                  <div className="wide knowledge-options">
                    <span>知识库</span>
                    {knowledgeBases.map((item) => (
                      <label className="check" key={item.id}>
                        <input
                          type="checkbox"
                          checked={(editing.knowledgeBaseIds ?? []).includes(item.id)}
                          onChange={(event) => {
                            const current = editing.knowledgeBaseIds ?? [];
                            updateEditing(
                              'knowledgeBaseIds',
                              event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id),
                            );
                          }}
                        />
                        <span>{item.name}</span>
                      </label>
                    ))}
                    {!knowledgeBases.length && <span>暂无知识库</span>}
                  </div>
                  <label className="wide">
                    <span>扩展 ID（每行一个）</span>
                    <textarea
                      rows={8}
                      value={(editing.extensionIds ?? []).join('\n')}
                      onChange={(e) => updateEditing('extensionIds', e.target.value.split('\n').filter(Boolean))}
                    />
                  </label>
                </div>
              )}
            </div>
            <footer>
              <button onClick={() => setEditing(null)}>取消</button>
              <button className="primary" disabled={loading} onClick={save}>
                保存
              </button>
            </footer>
          </section>
        </div>
      )}

      {chatting && <ChatDialog assistant={chatting} onClose={() => setChatting(null)} />}
    </main>
  );
}

function ChatDialog({ assistant, onClose }: { assistant: Assistant; onClose: () => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [recording, setRecording] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    assistantApi
      .conversations(assistant.id)
      .then(setConversations)
      .catch((error) => setStatus(errorText(error)));
  }, [assistant.id]);

  const selectConversation = async (id: string) => {
    setStatus('');
    try {
      setConversationId(id || undefined);
      setMessages(id ? await assistantApi.messages(assistant.id, id) : []);
    } catch (error) {
      setStatus(errorText(error));
    }
  };

  const send = async () => {
    if (!text || loading) return;
    setLoading(true);
    setStatus('');
    try {
      const result = await assistantApi.chat(assistant.id, text, conversationId);
      setMessages((items) => [...items, result.userMessage, result.assistantMessage]);
      setConversationId(result.conversation.id);
      setConversations((items) =>
        items.some((item) => item.id === result.conversation.id) ? items : [result.conversation, ...items],
      );
      setText('');
      if (autoPlay) await speak(result.assistantMessage.content);
    } catch (error) {
      setStatus(errorText(error));
    } finally {
      setLoading(false);
    }
  };

  const speak = async (content: string) => {
    try {
      const result = await assistantApi.speech(assistant.id, content);
      const audio = new Audio(`data:${result.contentType};base64,${result.audioBase64}`);
      await audio.play();
    } catch (error) {
      setStatus(errorText(error));
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setStatus('当前浏览器不支持录音');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus'].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (!blob.size) return;
        setStatus('正在识别录音');
        try {
          const result = await assistantApi.transcribe(assistant.id, blob);
          setText(result.text);
          setStatus('');
        } catch (error) {
          setStatus(errorText(error));
        }
      };
      recorder.start();
      setRecording(true);
      setStatus('正在录音');
    } catch (error) {
      setStatus(errorText(error));
    }
  };

  useEffect(
    () => () => {
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  return (
    <div className="assistant-modal-mask">
      <section className="assistant-modal chat-modal">
        <header>
          <h2>{assistant.name} · 对话</h2>
          <button onClick={onClose}>×</button>
        </header>
        <div className="chat-toolbar">
          <select value={conversationId ?? ''} onChange={(e) => selectConversation(e.target.value)}>
            <option value="">新会话</option>
            {conversations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <label className="check">
            <input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} />
            <span>自动播报回复</span>
          </label>
        </div>
        <div className="chat-messages">
          {messages.map((message) => (
            <div className={`chat-message ${message.role}`} key={message.id}>
              <span>{message.content}</span>
              {message.role === 'assistant' && <button onClick={() => speak(message.content)}>播放</button>}
            </div>
          ))}
          {!messages.length && <div className="assistant-empty">开始和 {assistant.assistantName} 对话</div>}
        </div>
        {status && <p className="assistants-status">{status}</p>}
        <footer className="chat-input">
          <button className={recording ? 'recording' : ''} onClick={toggleRecording}>
            {recording ? '停止录音' : '语音输入'}
          </button>
          <textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button className="primary" disabled={!text || loading} onClick={send}>
            发送
          </button>
        </footer>
      </section>
    </div>
  );
}
