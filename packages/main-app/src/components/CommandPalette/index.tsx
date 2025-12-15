import { type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pushUrl } from '../../utils/safeHistory';

export type CommandItem = {
  id: string;
  title: string;
  subtitle?: string;
  keywords?: string[];
  href?: string;
  action?: () => void | Promise<void>;
};

type CommandPaletteProps = {
  commands: CommandItem[];
};

const normalize = (value: string) => value.trim().toLowerCase();

const scoreCommand = (command: CommandItem, query: string) => {
  if (!query) return 0;
  const q = normalize(query);
  if (!q) return 0;
  const haystacks = [command.title, command.subtitle, command.href, ...(command.keywords ?? [])]
    .filter(Boolean)
    .map((v) => normalize(String(v)));

  for (const hay of haystacks) {
    if (hay === q) return 100;
    if (hay.startsWith(q)) return 80;
    if (hay.includes(q)) return 60;
  }
  return -1;
};

const isHttpUrl = (value: string) => value.startsWith('http://') || value.startsWith('https://');

const runCommand = async (command: CommandItem) => {
  if (command.action) {
    await command.action();
    return;
  }
  if (!command.href) return;
  if (isHttpUrl(command.href)) {
    window.open(command.href, '_blank', 'noopener,noreferrer');
    return;
  }
  pushUrl(command.href);
};

const CommandPalette = ({ commands }: CommandPaletteProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPalette = useCallback(() => {
    setOpen(true);
    setQuery('');
    setActiveIndex(0);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault();
        openPalette();
        return;
      }
      if (!open) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closePalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closePalette, open, openPalette]);

  useEffect(() => {
    const handler = () => openPalette();
    window.addEventListener('main-app:open-command-palette', handler as EventListener);
    return () => window.removeEventListener('main-app:open-command-palette', handler as EventListener);
  }, [openPalette]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return commands.slice(0, 50);
    return commands
      .map((c) => ({ c, score: scoreCommand(c, q) }))
      .filter((row) => row.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((row) => row.c)
      .slice(0, 50);
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    if (activeIndex >= filtered.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, filtered.length, open]);

  const onKeyDown = async (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((idx) => Math.min(filtered.length - 1, idx + 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((idx) => Math.max(0, idx - 1));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const cmd = filtered[activeIndex];
      if (!cmd) return;
      closePalette();
      await runCommand(cmd);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[5000] flex items-start justify-center px-4 pt-[10vh]">
      <button type="button" aria-label="关闭命令面板" className="absolute inset-0 bg-black/50" onClick={closePalette} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="命令面板"
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--stage-bg)] shadow-[var(--stage-shadow)] backdrop-blur-xl"
      >
        <div className="flex items-center gap-3 border-b border-[var(--glass-border)] px-4 py-3">
          <span className="text-xs font-semibold tracking-wide text-[var(--color-muted)]">Cmd / Ctrl + K</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="搜索功能或输入路径…"
            className="w-full bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-muted)]"
          />
          <button
            type="button"
            onClick={closePalette}
            className="rounded-md px-2 py-1 text-xs text-[var(--color-muted)] hover:bg-black/10"
          >
            Esc
          </button>
        </div>

        <div className="max-h-[60vh] overflow-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">没有匹配结果</div>
          ) : (
            filtered.map((cmd, idx) => {
              const active = idx === activeIndex;
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={async () => {
                    closePalette();
                    await runCommand(cmd);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm ${
                    active ? 'bg-black/10' : 'hover:bg-black/5'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-[var(--color-text)]">{cmd.title}</div>
                    {(cmd.subtitle || cmd.href) && (
                      <div className="truncate text-xs text-[var(--color-muted)]">{cmd.subtitle ?? cmd.href}</div>
                    )}
                  </div>
                  {cmd.href && (
                    <span className="shrink-0 rounded bg-black/10 px-2 py-1 text-xs text-[var(--color-muted)]">
                      {isHttpUrl(cmd.href) ? '↗' : cmd.href}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
