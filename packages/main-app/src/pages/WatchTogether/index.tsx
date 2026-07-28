import { resolveApiBase } from '@zxkws/shared-fetch';
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

type ChatPayload = {
  from?: {
    name?: unknown;
  };
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

export default function WatchTogetherPage() {
  const initialRoom = useMemo(() => {
    const query = new URLSearchParams(window.location.search);
    return (query.get('room') || '').trim() || randomRoomId();
  }, []);

  const [roomId, setRoomId] = useState(initialRoom);
  const [name, setName] = useState(() => localStorage.getItem('wt_name') || '');
  const [mediaUrl, setMediaUrl] = useState('');
  const [hostId, setHostId] = useState('');
  const [socketId, setSocketId] = useState('');
  const [members, setMembers] = useState<unknown>(null);
  const [chatLines, setChatLines] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [statusText, setStatusText] = useState('未连接');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<SocketLike | null>(null);
  const applyingRemote = useRef(false);

  const isHost = Boolean(socketId && hostId && socketId === hostId);

  const appendChat = (line: string) => {
    setChatLines((previous) => [...previous.slice(-200), line]);
  };

  const connect = async () => {
    const nextRoomId = roomId.trim();
    if (!nextRoomId) {
      throw new Error('请输入房间 ID');
    }

    const origin = resolveSocketOrigin();
    const clientScriptUrl = `${origin}/socket.io/socket.io.js`;
    const roomUrl = new URL(window.location.href);
    roomUrl.searchParams.set('room', nextRoomId);
    window.history.replaceState(window.history.state, '', roomUrl);

    setStatusText('正在加载连接组件…');
    await loadScriptOnce(clientScriptUrl);
    if (!window.io) throw new Error('socket.io client 未注入（window.io 缺失）');

    socketRef.current?.disconnect();
    setSocketId('');
    setHostId('');
    setMembers(null);

    const socket = window.io(`${origin}/watch-together`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      const id = socket.id || '';
      setSocketId(id);
      setStatusText('已连接');
      socket.emit('join', { roomId: nextRoomId, name });
    });

    socket.on<RoomPayload>('joined', (data) => {
      setHostId(String(data?.hostId ?? ''));
      appendChat(
        `[system] joined room=${String(data?.roomId ?? '')} socket=${socket.id ?? ''} host=${String(data?.hostId ?? '')}`,
      );
    });

    socket.on<RoomPayload>('host', (data) => {
      setHostId(String(data?.hostId ?? ''));
      appendChat(`[system] new host=${String(data?.hostId ?? '')}`);
    });

    socket.on<RoomPayload>('members', (data) => {
      setHostId(String(data?.hostId ?? ''));
      setMembers(data);
    });

    socket.on<ChatPayload>('chat', (message) => {
      appendChat(`[${String(message?.from?.name ?? '')}] ${String(message?.text ?? '')}`);
    });

    socket.on<unknown>('error', (error) => {
      appendChat(`[error] ${typeof error === 'string' ? error : JSON.stringify(error)}`);
    });

    socket.on<Error>('connect_error', (error) => {
      setStatusText(error?.message || '连接失败');
    });

    socket.on('disconnect', () => {
      setSocketId('');
      setStatusText('已断开');
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
        if (url && video.getAttribute('src') !== url) {
          video.src = url;
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
          const playResult = video.play();
          if (playResult && typeof playResult.catch === 'function') {
            playResult.catch(() => undefined);
          }
        } else {
          video.pause();
          video.playbackRate = 1;
        }
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
    setMembers(null);
    setStatusText('已断开');
  };

  const emitControl = (action: 'play' | 'pause' | 'seek', position?: number) => {
    socketRef.current?.emit('control', { roomId: roomId.trim(), action, position });
  };

  const setRemoteMedia = () => {
    const socket = socketRef.current;
    if (!socket) {
      appendChat('[system] 请先连接房间');
      return;
    }
    if (!isHost) {
      appendChat('[system] 只有房主可设置媒体');
      return;
    }
    socket.emit('setMedia', { roomId: roomId.trim(), url: mediaUrl.trim() });
  };

  const sendChat = () => {
    const socket = socketRef.current;
    if (!socket) {
      appendChat('[system] 请先连接房间');
      return;
    }
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    socket.emit('chat', { roomId: roomId.trim(), text, name: name.trim() });
  };

  const copyLink = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomId.trim());
      await navigator.clipboard.writeText(url.toString());
      appendChat('[system] 房间链接已复制');
    } catch (error) {
      appendChat(`[error] ${error instanceof Error ? error.message : '复制失败'}`);
    }
  };

  useEffect(() => {
    handleConnect();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem('wt_name', name);
  }, [name]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      if (!applyingRemote.current && isHost) {
        emitControl('play', video.currentTime || 0);
      }
    };
    const onPause = () => {
      if (!applyingRemote.current && isHost) {
        emitControl('pause', video.currentTime || 0);
      }
    };
    const onSeeked = () => {
      if (!applyingRemote.current && isHost) {
        emitControl('seek', video.currentTime || 0);
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
    };
  }, [isHost, roomId]);

  return (
    <div className="workspace-page">
      <header className="workspace-page__header">
        <div>
          <p className="workspace-page__eyebrow">Synchronized room</p>
          <h1>一起看</h1>
          <p className="workspace-page__description">共享媒体地址、同步播放进度，并在同一个房间内实时聊天。</p>
        </div>
        <div className="workspace-page__actions">
          <span className="workspace-status" data-connected={Boolean(socketId)}>
            {statusText} · {isHost ? '房主' : '观众'}
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
              <p className="workspace-panel__meta">连接后，房主的播放、暂停和跳转操作会同步给所有成员。</p>
            </div>
          </div>

          <div className="watch-connect-grid">
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
              <span>媒体地址</span>
              <input
                className="workspace-input workspace-input--mono"
                value={mediaUrl}
                onChange={(event) => setMediaUrl(event.target.value)}
                placeholder="https://example.com/video.mp4"
              />
            </label>
            <button
              type="button"
              className="workspace-button workspace-button--primary"
              onClick={setRemoteMedia}
              disabled={!isHost}
            >
              设置媒体
            </button>
          </div>

          <div className="watch-controls">
            <button
              type="button"
              className="workspace-button workspace-button--primary"
              onClick={() => emitControl('play', videoRef.current?.currentTime || 0)}
              disabled={!isHost}
            >
              播放
            </button>
            <button
              type="button"
              className="workspace-button"
              onClick={() => emitControl('pause', videoRef.current?.currentTime || 0)}
              disabled={!isHost}
            >
              暂停
            </button>
            <button
              type="button"
              className="workspace-button"
              onClick={() => emitControl('seek', Math.max(0, (videoRef.current?.currentTime || 0) - 10))}
              disabled={!isHost}
            >
              后退 10 秒
            </button>
            <button
              type="button"
              className="workspace-button"
              onClick={() => emitControl('seek', (videoRef.current?.currentTime || 0) + 10)}
              disabled={!isHost}
            >
              前进 10 秒
            </button>
            <span className="watch-controls__ids">
              socket={socketId} host={hostId}
            </span>
          </div>

          <p className="watch-note">同步策略：漂移超过 0.5 秒时跳转；较小漂移通过短暂调整播放速度完成对齐。</p>
        </section>

        <aside className="workspace-panel watch-side">
          <section>
            <h2>成员数据</h2>
            <pre className="watch-code">{members === null ? '暂无成员数据' : JSON.stringify(members, null, 2)}</pre>
          </section>

          <section>
            <h2>房间聊天</h2>
            <div className="watch-chat-form">
              <input
                className="workspace-input"
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                    sendChat();
                  }
                }}
                placeholder="输入消息，按 Enter 发送"
              />
              <button type="button" className="workspace-button workspace-button--primary" onClick={sendChat}>
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
