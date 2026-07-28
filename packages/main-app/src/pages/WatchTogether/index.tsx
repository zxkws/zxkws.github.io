import { resolveApiBase } from '@zxkws/shared-fetch';
import type Hls from 'hls.js';
import { useEffect, useMemo, useRef, useState } from 'react';

type SocketLike = {
  id?: string;
  on: <T = unknown>(_event: string, _callback: (payload: T) => void) => void;
  emit: (_event: string, _payload?: unknown) => void;
  disconnect: () => void;
};

type RoomPayload = {
  hostId?: unknown;
  roomId?: unknown;
};

type WatchMember = {
  socketId: string;
  name: string;
  joinedAt: number;
  canControl: boolean;
  muted: boolean;
};

type MembersPayload = RoomPayload & {
  members?: WatchMember[];
};

type ChatPayload = {
  from?: { name?: unknown };
  text?: unknown;
};

type PlaybackState = RoomPayload & {
  serverNow?: unknown;
  position?: unknown;
  isPlaying?: unknown;
  mediaUrl?: unknown;
};

declare global {
  interface Window {
    io?: (_uri: string, _options?: unknown) => SocketLike;
  }
}

const resolveSocketOrigin = () => {
  const apiBase = resolveApiBase({
    rawBase: process.env.API_BASE_URL,
    dev: process.env.NODE_ENV === 'development',
  });
  if (apiBase?.startsWith('http')) {
    try {
      return new URL(apiBase).origin;
    } catch {
      return window.location.origin;
    }
  }
  return window.location.origin;
};

const loadScriptOnce = (src: string) =>
  new Promise<void>((resolve, reject) => {
    if (window.io) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[data-socket-io="1"][src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('socket.io 脚本加载失败')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.socketIo = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('socket.io 脚本加载失败'));
    document.head.appendChild(script);
  });

const randomRoomId = () => Math.random().toString(36).slice(2, 10);

const bufferedEnd = (video: HTMLVideoElement) =>
  video.buffered.length ? video.buffered.end(video.buffered.length - 1) : 0;

export default function WatchTogetherPage() {
  const initialRoom = useMemo(() => {
    const query = new URLSearchParams(window.location.search);
    return (query.get('room') || '').trim() || randomRoomId();
  }, []);
  const [roomId, setRoomId] = useState(initialRoom);
  const [name, setName] = useState(() => localStorage.getItem('wt_name') || '');
  const [password, setPassword] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [hostId, setHostId] = useState('');
  const [socketId, setSocketId] = useState('');
  const [members, setMembers] = useState<WatchMember[]>([]);
  const [metrics, setMetrics] = useState<unknown>(null);
  const [chatLines, setChatLines] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [statusText, setStatusText] = useState('未连接');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<SocketLike | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const loadedMediaUrlRef = useRef('');
  const applyingRemote = useRef(false);

  const me = members.find((member) => member.socketId === socketId);
  const isHost = Boolean(socketId && hostId && socketId === hostId);
  const canControl = isHost || me?.canControl === true;

  const appendChat = (line: string) => {
    setChatLines((previous) => [...previous.slice(-200), line]);
  };

  const destroyHls = () => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
  };

  const loadMedia = async (url: string) => {
    const video = videoRef.current;
    if (!video) return;
    destroyHls();
    video.removeAttribute('src');
    video.load();
    if (!url) return;
    const isHls = (() => {
      try {
        return new URL(url).pathname.toLowerCase().endsWith('.m3u8');
      } catch {
        return false;
      }
    })();
    if (!isHls || video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      return;
    }
    const { default: HlsClient } = await import('hls.js');
    if (!HlsClient.isSupported()) throw new Error('当前浏览器不支持 HLS 播放');
    const hls = new HlsClient({ enableWorker: true });
    hlsRef.current = hls;
    hls.on(HlsClient.Events.ERROR, (_event, data) => {
      if (data.fatal) appendChat(`[media error] ${data.type}: ${data.details}`);
    });
    hls.loadSource(url);
    hls.attachMedia(video);
  };

  const connect = async () => {
    const nextRoomId = roomId.trim();
    if (!nextRoomId) throw new Error('请输入房间 ID');
    const origin = resolveSocketOrigin();
    const roomUrl = new URL(window.location.href);
    roomUrl.searchParams.set('room', nextRoomId);
    window.history.replaceState(window.history.state, '', roomUrl);
    setStatusText('正在加载连接组件…');
    await loadScriptOnce(`${origin}/socket.io/socket.io.js`);
    if (!window.io) throw new Error('socket.io client 未注入（window.io 缺失）');

    socketRef.current?.disconnect();
    setSocketId('');
    setHostId('');
    setMembers([]);
    setMetrics(null);
    const socket = window.io(`${origin}/watch-together`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      const id = socket.id || '';
      setSocketId(id);
      setStatusText('正在加入房间…');
      socket.emit('join', { roomId: nextRoomId, name, password });
    });
    socket.on<RoomPayload>('joined', (data) => {
      setHostId(String(data?.hostId ?? ''));
      setStatusText('已加入房间');
      appendChat(
        `[system] joined room=${String(data?.roomId ?? '')} socket=${socket.id ?? ''} host=${String(data?.hostId ?? '')}`,
      );
    });
    socket.on<RoomPayload>('host', (data) => {
      setHostId(String(data?.hostId ?? ''));
      appendChat(`[system] new host=${String(data?.hostId ?? '')}`);
    });
    socket.on<MembersPayload>('members', (data) => {
      setHostId(String(data?.hostId ?? ''));
      setMembers(Array.isArray(data?.members) ? data.members : []);
    });
    socket.on<unknown>('metrics', (data) => setMetrics(data));
    socket.on<ChatPayload>('chat', (chat) => {
      appendChat(`[${String(chat?.from?.name ?? '')}] ${String(chat?.text ?? '')}`);
    });
    socket.on<{ message?: unknown }>('roomError', (error) => {
      const text = String(error?.message ?? '房间操作失败');
      setStatusText(text);
      appendChat(`[error] ${text}`);
    });
    socket.on('kicked', () => {
      setStatusText('已被房主移出房间');
      appendChat('[system] 你已被房主移出房间');
    });
    socket.on<Error>('connect_error', (error) => setStatusText(error?.message || '连接失败'));
    socket.on('disconnect', () => {
      setSocketId('');
      setStatusText((current) => (current.includes('移出') ? current : '已断开'));
    });
    socket.on<PlaybackState>('state', async (state) => {
      setHostId(String(state?.hostId ?? ''));
      const video = videoRef.current;
      if (!video) return;
      const now = Date.now();
      const serverNow = typeof state?.serverNow === 'number' ? state.serverNow : now;
      const latencySeconds = Math.max(0, (now - serverNow) / 1000);
      const position = typeof state?.position === 'number' ? state.position : 0;
      const targetPosition = position + (state?.isPlaying ? latencySeconds : 0);

      applyingRemote.current = true;
      try {
        const url = typeof state?.mediaUrl === 'string' ? state.mediaUrl : '';
        if (url !== loadedMediaUrlRef.current) {
          await loadMedia(url);
          loadedMediaUrlRef.current = url;
          setMediaUrl(url);
        }
        const drift = (video.currentTime || 0) - targetPosition;
        const absoluteDrift = Math.abs(drift);
        if (absoluteDrift > 0.5 && Number.isFinite(targetPosition)) {
          video.currentTime = targetPosition;
          video.playbackRate = 1;
        } else if (absoluteDrift > 0.1 && state?.isPlaying) {
          video.playbackRate = drift < 0 ? 1.05 : 0.95;
        } else {
          video.playbackRate = 1;
        }
        if (state?.isPlaying) {
          video.play().catch(() => undefined);
        } else {
          video.pause();
          video.playbackRate = 1;
        }
      } catch (error) {
        appendChat(`[media error] ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        window.setTimeout(() => {
          applyingRemote.current = false;
        }, 50);
      }
    });
  };

  const handleConnect = () => {
    connect().catch((error) => {
      const text = error instanceof Error ? error.message : '连接失败';
      setStatusText(text);
      appendChat(`[error] ${text}`);
    });
  };

  const disconnect = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setSocketId('');
    setHostId('');
    setMembers([]);
    setMetrics(null);
    setStatusText('已断开');
  };

  const emitControl = (action: 'play' | 'pause' | 'seek', position?: number) => {
    socketRef.current?.emit('control', { roomId: roomId.trim(), action, position });
  };

  const setRemoteMedia = () => {
    if (!socketRef.current || !canControl) {
      appendChat('[system] 需要房主或控制权限');
      return;
    }
    socketRef.current.emit('setMedia', { roomId: roomId.trim(), url: mediaUrl.trim() });
  };

  const govern = (targetSocketId: string, action: 'grant' | 'revoke' | 'mute' | 'unmute' | 'kick') => {
    if (action === 'kick' && !window.confirm('确认把该成员移出房间？')) return;
    socketRef.current?.emit('govern', { roomId: roomId.trim(), targetSocketId, action });
  };

  const sendChat = () => {
    const text = chatInput.trim();
    if (!socketRef.current || !text) return;
    setChatInput('');
    socketRef.current.emit('chat', { roomId: roomId.trim(), text });
  };

  const copyLink = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomId.trim());
      await navigator.clipboard.writeText(url.toString());
      appendChat('[system] 房间链接已复制；密码不会写入链接');
    } catch (error) {
      appendChat(`[error] ${error instanceof Error ? error.message : '复制失败'}`);
    }
  };

  useEffect(() => {
    handleConnect();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      destroyHls();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('wt_name', name);
  }, [name]);

  useEffect(() => {
    if (!socketId) return;
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      socketRef.current?.emit('report', {
        roomId: roomId.trim(),
        position: video.currentTime || 0,
        bufferedEnd: bufferedEnd(video),
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [socketId, roomId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => {
      if (!applyingRemote.current && canControl) emitControl('play', video.currentTime || 0);
    };
    const onPause = () => {
      if (!applyingRemote.current && canControl) emitControl('pause', video.currentTime || 0);
    };
    const onSeeked = () => {
      if (!applyingRemote.current && canControl) emitControl('seek', video.currentTime || 0);
    };
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
    };
  }, [canControl, roomId]);

  return (
    <div className="workspace-page">
      <header className="workspace-page__header">
        <div>
          <p className="workspace-page__eyebrow">Synchronized room</p>
          <h1>一起看</h1>
          <p className="workspace-page__description">
            创建带密码的房间，同步 MP4 或 HLS 媒体，并由房主管理控制权、发言和成员。
          </p>
        </div>
        <div className="workspace-page__actions">
          <span className="workspace-status" data-connected={Boolean(socketId)}>
            {statusText} · {isHost ? '房主' : canControl ? '协作者' : '观众'}
          </span>
          {socketId && (
            <button type="button" className="workspace-button" onClick={disconnect}>
              断开
            </button>
          )}
        </div>
      </header>

      <div className="watch-layout">
        <section className="workspace-panel">
          <div className="workspace-panel__header">
            <div>
              <h2>房间与媒体</h2>
              <p className="workspace-panel__meta">首次进入的成员成为房主；首次连接时填写的密码会保护新房间。</p>
            </div>
          </div>
          <div className="watch-connect-grid watch-connect-grid--protected">
            <label className="workspace-field">
              <span>房间 ID</span>
              <input
                className="workspace-input workspace-input--mono"
                value={roomId}
                onChange={(event) => setRoomId(event.target.value)}
              />
            </label>
            <label className="workspace-field">
              <span>显示名称</span>
              <input
                className="workspace-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="输入你的名称"
              />
            </label>
            <label className="workspace-field">
              <span>房间密码（可选）</span>
              <input
                className="workspace-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="off"
              />
            </label>
            <div className="workspace-inline-actions">
              <button type="button" className="workspace-button workspace-button--primary" onClick={handleConnect}>
                连接
              </button>
              <button type="button" className="workspace-button" onClick={copyLink}>
                复制链接
              </button>
            </div>
          </div>

          <video ref={videoRef} controls playsInline className="watch-video">
            <track kind="captions" />
          </video>
          <div className="watch-media-grid">
            <label className="workspace-field">
              <span>MP4 / HLS 媒体地址</span>
              <input
                className="workspace-input workspace-input--mono"
                value={mediaUrl}
                onChange={(event) => setMediaUrl(event.target.value)}
                placeholder="https://example.com/video.mp4 或 video.m3u8"
              />
            </label>
            <button
              type="button"
              className="workspace-button workspace-button--primary"
              onClick={setRemoteMedia}
              disabled={!canControl}
            >
              设置媒体
            </button>
          </div>
          <div className="watch-controls">
            <button
              type="button"
              className="workspace-button workspace-button--primary"
              onClick={() => emitControl('play', videoRef.current?.currentTime || 0)}
              disabled={!canControl}
            >
              播放
            </button>
            <button
              type="button"
              className="workspace-button"
              onClick={() => emitControl('pause', videoRef.current?.currentTime || 0)}
              disabled={!canControl}
            >
              暂停
            </button>
            <button
              type="button"
              className="workspace-button"
              onClick={() => emitControl('seek', Math.max(0, (videoRef.current?.currentTime || 0) - 10))}
              disabled={!canControl}
            >
              后退 10 秒
            </button>
            <button
              type="button"
              className="workspace-button"
              onClick={() => emitControl('seek', (videoRef.current?.currentTime || 0) + 10)}
              disabled={!canControl}
            >
              前进 10 秒
            </button>
            <span className="watch-controls__ids">
              socket={socketId} host={hostId}
            </span>
          </div>
          <p className="watch-note">漂移超过 0.5 秒时跳转；较小漂移通过短暂调整播放速度对齐。</p>
        </section>

        <aside className="workspace-panel watch-side">
          <section>
            <h2>成员与房主管理</h2>
            <div className="watch-member-list">
              {members.map((member) => (
                <div className="watch-member" key={member.socketId}>
                  <div>
                    <strong>{member.name}</strong>
                    <span>{member.socketId}</span>
                    <span>
                      canControl: {String(member.canControl)} · muted: {String(member.muted)}
                    </span>
                  </div>
                  {isHost && member.socketId !== socketId && (
                    <div className="watch-member__actions">
                      <button
                        type="button"
                        className="workspace-button"
                        onClick={() => govern(member.socketId, member.canControl ? 'revoke' : 'grant')}
                      >
                        {member.canControl ? '收回控制' : '授予控制'}
                      </button>
                      <button
                        type="button"
                        className="workspace-button"
                        onClick={() => govern(member.socketId, member.muted ? 'unmute' : 'mute')}
                      >
                        {member.muted ? '解除禁言' : '禁言'}
                      </button>
                      <button
                        type="button"
                        className="workspace-button workspace-button--danger"
                        onClick={() => govern(member.socketId, 'kick')}
                      >
                        移出
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {!members.length && <p className="watch-empty">暂无成员数据</p>}
            </div>
          </section>
          <section>
            <h2>同步指标</h2>
            <pre className="watch-code">{metrics === null ? '暂无同步指标' : JSON.stringify(metrics, null, 2)}</pre>
          </section>
          <section>
            <h2>房间聊天</h2>
            <div className="watch-chat-form">
              <input
                className="workspace-input"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing) sendChat();
                }}
                placeholder={me?.muted ? '你已被禁言' : '输入消息，按 Enter 发送'}
                disabled={me?.muted}
              />
              <button
                type="button"
                className="workspace-button workspace-button--primary"
                onClick={sendChat}
                disabled={me?.muted}
              >
                发送
              </button>
            </div>
            <pre className="watch-code">{chatLines.join('\n')}</pre>
          </section>
        </aside>
      </div>
    </div>
  );
}
