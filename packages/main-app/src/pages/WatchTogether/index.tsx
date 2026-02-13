import { resolveApiBase } from '@zxkws/shared-fetch';
import { useEffect, useMemo, useRef, useState } from 'react';

type SocketLike = {
  id?: string;
  on: (_event: string, _cb: (..._args: unknown[]) => void) => void;
  emit: (_event: string, _payload?: unknown) => void;
  disconnect: () => void;
};

declare global {
  interface Window {
    io?: (_uri: string, _opts?: unknown) => SocketLike;
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
    const existed = document.querySelector(`script[data-socket-io="1"][src="${src}"]`);
    if (existed) {
      resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.dataset.socketIo = '1';
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('socket.io 脚本加载失败'));
    document.head.appendChild(el);
  });

const randomRoomId = () => Math.random().toString(36).slice(2, 10);

export default function WatchTogetherPage() {
  const initialRoom = useMemo(() => {
    const qs = new URLSearchParams(window.location.search);
    return (qs.get('room') || '').trim() || randomRoomId();
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

  const isHost = socketId && hostId && socketId === hostId;

  const appendChat = (line: string) => {
    setChatLines((prev) => [...prev.slice(-200), line]);
  };

  const connect = async () => {
    const origin = resolveSocketOrigin();
    const clientScriptUrl = `${origin}/socket.io/socket.io.js`;

    setStatusText('加载 socket.io…');
    await loadScriptOnce(clientScriptUrl);
    if (!window.io) throw new Error('socket.io client 未注入（window.io 缺失）');

    socketRef.current?.disconnect();
    const socket = window.io(`${origin}/watch-together`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      const id = socket.id || '';
      setSocketId(id);
      setStatusText('已连接');
      socket.emit('join', { roomId, name });
    });

    socket.on('joined', (data: any) => {
      setHostId(String(data?.hostId || ''));
      appendChat(`[system] joined room=${data?.roomId} socket=${socket.id} host=${data?.hostId}`);
    });

    socket.on('host', (data: any) => {
      setHostId(String(data?.hostId || ''));
      appendChat(`[system] new host=${data?.hostId}`);
    });

    socket.on('members', (data: any) => {
      setHostId(String(data?.hostId || ''));
      setMembers(data);
    });

    socket.on('chat', (msg: any) => {
      const who = String(msg?.from?.name || 'unknown');
      const text = String(msg?.text || '');
      appendChat(`[${who}] ${text}`);
    });

    socket.on('error', (e: any) => {
      appendChat(`[error] ${typeof e === 'string' ? e : JSON.stringify(e)}`);
    });

    socket.on('disconnect', () => {
      setStatusText('已断开');
    });

    socket.on('state', async (s: any) => {
      setHostId(String(s?.hostId || ''));

      const video = videoRef.current;
      if (!video) return;

      const now = Date.now();
      const serverNow = typeof s?.serverNow === 'number' ? s.serverNow : now;
      const rttFixSec = Math.max(0, (now - serverNow) / 1000);
      const targetPos = (typeof s?.position === 'number' ? s.position : 0) + (s?.isPlaying ? rttFixSec : 0);

      applyingRemote.current = true;
      try {
        const url = String(s?.mediaUrl || '').trim();
        if (url && video.src !== url) {
          video.src = url;
          setMediaUrl(url);
        }

        const drift = (video.currentTime || 0) - targetPos;
        const absDrift = Math.abs(drift);

        // 纠偏策略：
        // 1. 大漂移 (> 0.5s)：直接跳转 (Jump)
        // 2. 小漂移 (0.1s ~ 0.5s)：倍速微调 (Smooth Sync)
        // 3. 微漂移 (< 0.1s)：保持原速
        if (absDrift > 0.5 && Number.isFinite(targetPos)) {
          video.currentTime = targetPos;
          video.playbackRate = 1.0;
        } else if (absDrift > 0.1 && s?.isPlaying) {
          // 慢了就加速 5%，快了就减速 5%
          video.playbackRate = drift < 0 ? 1.05 : 0.95;
        } else {
          video.playbackRate = 1.0;
        }

        if (s?.isPlaying) {
          const p = video.play();
          if (p && typeof p.catch === 'function') {
            p.catch(() => undefined);
          }
        } else {
          video.pause();
          video.playbackRate = 1.0;
        }
      } finally {
        window.setTimeout(() => {
          applyingRemote.current = false;
        }, 50);
      }
    });
  };

  const emitControl = (action: 'play' | 'pause' | 'seek', position?: number) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('control', { roomId, action, position });
  };

  const setRemoteMedia = () => {
    const socket = socketRef.current;
    if (!socket) return;
    if (!isHost) {
      appendChat('[system] 只有房主可操作');
      return;
    }
    socket.emit('setMedia', { roomId, url: mediaUrl.trim() });
  };

  const sendChat = () => {
    const socket = socketRef.current;
    if (!socket) return;
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    socket.emit('chat', { roomId, text, name: name.trim() });
  };

  const copyLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId.trim());
    await navigator.clipboard.writeText(url.toString());
    appendChat('[system] link copied');
  };

  useEffect(() => {
    connect().catch((e) => setStatusText(e instanceof Error ? e.message : '连接失败'));
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
      if (applyingRemote.current) return;
      if (!isHost) return;
      emitControl('play', video.currentTime || 0);
    };
    const onPause = () => {
      if (applyingRemote.current) return;
      if (!isHost) return;
      emitControl('pause', video.currentTime || 0);
    };
    const onSeeked = () => {
      if (applyingRemote.current) return;
      if (!isHost) return;
      emitControl('seek', video.currentTime || 0);
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
    <div className="flex flex-1 flex-col gap-4 p-6 text-[var(--color-text)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500">Idea 3 · Watch Together</div>
          <div className="text-lg font-semibold">一起看（Socket.io 同步 + 聊天 · MVP）</div>
        </div>
        <div className="text-sm text-slate-600">
          状态：{statusText} · 角色：{isHost ? '房主' : '观众'}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-[var(--header-border)] bg-[var(--card-bg)] p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              roomId
              <input
                className="rounded border border-slate-200 p-2 font-mono"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              name
              <input
                className="rounded border border-slate-200 p-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Guest"
              />
            </label>
            <div className="flex items-end gap-2">
              <button
                type="button"
                className="w-full rounded bg-indigo-600 px-4 py-2 text-white shadow hover:bg-indigo-700"
                onClick={() => connect().catch((e) => setStatusText(e instanceof Error ? e.message : '连接失败'))}
              >
                Join
              </button>
              <button type="button" className="w-full rounded border border-slate-200 px-4 py-2" onClick={copyLink}>
                Copy Link
              </button>
            </div>
          </div>

          <div className="mt-4">
            <video ref={videoRef} controls playsInline className="w-full rounded-lg bg-black/20">
              <track kind="captions" />
            </video>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="md:col-span-2 flex flex-col gap-1 text-sm">
              media url（直链 MP4 / HLS 等）
              <input
                className="rounded border border-slate-200 p-2 font-mono"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://example.com/video.mp4"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                className="w-full rounded bg-blue-600 px-4 py-2 text-white shadow hover:bg-blue-700 disabled:opacity-60"
                onClick={setRemoteMedia}
                disabled={!isHost}
              >
                Set Media（房主）
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded bg-emerald-600 px-3 py-2 text-white shadow hover:bg-emerald-700 disabled:opacity-60"
              onClick={() => emitControl('play', videoRef.current?.currentTime || 0)}
              disabled={!isHost}
            >
              Play（房主）
            </button>
            <button
              type="button"
              className="rounded bg-slate-700 px-3 py-2 text-white shadow hover:bg-slate-800 disabled:opacity-60"
              onClick={() => emitControl('pause', videoRef.current?.currentTime || 0)}
              disabled={!isHost}
            >
              Pause（房主）
            </button>
            <button
              type="button"
              className="rounded border border-slate-200 px-3 py-2 disabled:opacity-60"
              onClick={() => emitControl('seek', Math.max(0, (videoRef.current?.currentTime || 0) - 10))}
              disabled={!isHost}
            >
              -10s（房主）
            </button>
            <button
              type="button"
              className="rounded border border-slate-200 px-3 py-2 disabled:opacity-60"
              onClick={() => emitControl('seek', (videoRef.current?.currentTime || 0) + 10)}
              disabled={!isHost}
            >
              +10s（房主）
            </button>
            <div className="ml-auto text-xs text-slate-600 font-mono">
              socket={socketId || '-'} host={hostId || '-'}
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-600">
            同步策略（MVP）：收到 state 后，若漂移 &gt; 0.4s 则跳转；否则仅对 play/pause 做对齐。
          </div>
        </div>

        <div className="rounded-lg border border-[var(--header-border)] bg-[var(--card-bg)] p-4 shadow-sm">
          <div className="text-sm font-semibold">Members</div>
          <pre className="mt-2 max-h-44 overflow-auto rounded bg-slate-50 p-3 text-xs text-slate-700">
            {members ? JSON.stringify(members, null, 2) : '暂无'}
          </pre>

          <div className="mt-4 text-sm font-semibold">Chat</div>
          <div className="mt-2 flex gap-2">
            <input
              className="w-full rounded border border-slate-200 p-2"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button
              type="button"
              className="rounded bg-indigo-600 px-3 py-2 text-white shadow hover:bg-indigo-700"
              onClick={sendChat}
            >
              Send
            </button>
          </div>
          <pre className="mt-2 max-h-64 overflow-auto rounded bg-slate-50 p-3 text-xs text-slate-700">
            {chatLines.join('\n')}
          </pre>
        </div>
      </div>
    </div>
  );
}
