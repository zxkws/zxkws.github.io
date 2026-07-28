import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkWikiLink from 'remark-wiki-link';
import remarkFrontmatter from 'remark-frontmatter';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/atom-one-dark.css';
import { Mermaid } from './Mermaid';
import { Note, useNoteStore } from '../store';
import { useEffect, useRef, useState, useMemo } from 'react';
import { uploadFile } from '../api';

const MAX_INLINE_FILE_SIZE = 5 * 1024 * 1024; // 5MB, avoid accidental huge embeds
const SPLIT_STORAGE_KEY = 'v-react-notes-split';
const MIN_SPLIT = 0.25;
const MAX_SPLIT = 0.75;

// Callout Types Mapping
const CALLOUT_VARIANTS: Record<string, { color: string; icon: string }> = {
  note: { color: '#0969da', icon: '📝' },
  info: { color: '#0969da', icon: 'ℹ️' },
  tip: { color: '#1a7f37', icon: '💡' },
  success: { color: '#1a7f37', icon: '✅' },
  question: { color: '#8250df', icon: '❓' },
  warning: { color: '#9a6700', icon: '⚠️' },
  failure: { color: '#d1242f', icon: '❌' },
  danger: { color: '#d1242f', icon: '⚡' },
  bug: { color: '#d1242f', icon: '🐞' },
  example: { color: '#8250df', icon: '🟣' },
  quote: { color: '#6e7781', icon: '💬' },
};

export const Editor = ({ note, onChange }: { note: Note; onChange: (md: string) => void }) => {
  const [value, setValue] = useState(note.contentMd);
  const { notes, setActive } = useNoteStore();

  // Memoize the wiki link plugin to avoid re-creation on render
  const wikiLinkPlugin = useMemo(() => {
    return [
      remarkWikiLink,
      {
        hrefTemplate: (permalink: string) => `note:${permalink}`,
        pageResolver: (name: string) => [name],
        aliasDivider: '|',
      },
    ];
  }, []);

  const [split, setSplit] = useState<number>(() => {
    if (typeof window === 'undefined') return 0.5;
    const raw = window.localStorage.getItem(SPLIT_STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    if (!Number.isFinite(parsed)) return 0.5;
    return Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, parsed));
  });
  const splitRef = useRef(split);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    splitRef.current = split;
  }, [split]);

  // When switching notes, reset editor content to the new note.
  useEffect(() => {
    setValue(note.contentMd);
    valueRef.current = note.contentMd;
  }, [note.id]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setValue(next);
    valueRef.current = next;
    onChange(next);
  };

  const insertAtCursor = (text: string) => {
    const el = textareaRef.current;
    const current = valueRef.current;
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    const next = current.slice(0, start) + text + current.slice(end);
    setValue(next);
    valueRef.current = next;
    onChange(next);
    if (el) {
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + text.length;
        el.setSelectionRange(pos, pos);
      });
    }
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      try {
        if (file.size > MAX_INLINE_FILE_SIZE) {
          const ok = window.confirm(
            `${file.name} 大小 ${(file.size / 1024 / 1024).toFixed(1)}MB，上传可能较慢，仍然要插入吗？`,
          );
          if (!ok) continue;
        }

        const record = await uploadFile(file);
        const url = record.signedUrl || record.url;
        const safeName = file.name.replace(/\s+/g, ' ');
        const md = file.type.startsWith('image/') ? `![${safeName}](${url})\n` : `[${safeName}](${url})\n`;
        insertAtCursor(md);
      } catch (err) {
        console.warn('[notes-editor] upload failed, fallback to inline data url', err);
        try {
          const dataUrl = await fileToDataUrl(file);
          const safeName = file.name.replace(/\s+/g, ' ');
          const md = file.type.startsWith('image/') ? `![${safeName}](${dataUrl})\n` : `[${safeName}](${dataUrl})\n`;
          insertAtCursor(md);
        } catch (fallbackErr) {
          console.warn('[notes-editor] inline fallback failed', fallbackErr);
        }
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const files = items
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter(Boolean) as File[];
    if (files.length === 0) {
      return;
    }
    e.preventDefault();
    void handleFiles(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    e.preventDefault();
    void handleFiles(files);
  };

  const handleSplitterPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    let latest = splitRef.current;

    const onMove = (ev: PointerEvent) => {
      const ratio = (ev.clientX - rect.left) / rect.width;
      latest = Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, ratio));
      setSplit(latest);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      try {
        window.localStorage.setItem(SPLIT_STORAGE_KEY, String(latest));
      } catch {
        /* ignore */
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      ref={containerRef}
      className="editor"
      style={{
        gridTemplateColumns: `${split * 100}% 8px ${100 - split * 100}%`,
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
      <div className="splitter" onPointerDown={handleSplitterPointerDown} />
      <div className="preview">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath, remarkFrontmatter, wikiLinkPlugin] as never}
          rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }], rehypeKatex] as never}
          components={{
            code(props) {
              const { children, className, node, ...rest } = props;
              void node;
              const match = /language-(\w+)/.exec(className || '');
              if (match && match[1] === 'mermaid') {
                return <Mermaid content={String(children).replace(/\n$/, '')} />;
              }
              return (
                <code className={className} {...rest}>
                  {children}
                </code>
              );
            },
            a(props) {
              const { href, children, ...rest } = props;
              if (href?.startsWith('note:')) {
                const targetName = href.slice(5);
                const isMissing = !Object.values(notes).some((n) => n.title === targetName);
                return (
                  <a
                    {...rest}
                    className={`wiki-link ${isMissing ? 'is-missing' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      // Find note by title
                      const targetNote = Object.values(notes).find((n) => n.title === targetName);
                      if (targetNote) {
                        setActive(targetNote.id);
                      } else {
                        alert(`Note "${targetName}" not found.`);
                      }
                    }}
                    style={{
                      cursor: 'pointer',
                      color: isMissing ? '#999' : undefined,
                      textDecoration: 'none',
                    }}
                  >
                    {children}
                  </a>
                );
              }
              return (
                <a href={href} {...rest}>
                  {children}
                </a>
              );
            },
            blockquote(props) {
              // Simple check for Callout syntax: > [!INFO] Title
              const { children } = props;
              // ReactMarkdown structure for blockquote often wraps content in p
              // We need to inspect the first child to see if it's a paragraph containing the trigger
              const firstChild = Array.isArray(children) ? children[0] : children;

              if (
                typeof firstChild === 'object' &&
                firstChild &&
                'props' in firstChild &&
                typeof firstChild.props.children === 'string'
              ) {
                const text = firstChild.props.children as string;
                const match = text.match(/^\[!(\w+)\](?: (.*))?$/);

                if (match) {
                  const type = match[1].toLowerCase();
                  const title = match[2];
                  const variant = CALLOUT_VARIANTS[type] || CALLOUT_VARIANTS.note;

                  // Content excluding the first line (the title line)
                  // But wait, ReactMarkdown splits by blocks.
                  // If "text" is just the first line, subsequent lines might be in other children.
                  // However, common mark usually keeps the paragraph together if not separated by newline.
                  // For robust implementation in React without a plugin, we just handle the simplest case:
                  // The blockquote contains one or more paragraphs. We style the whole blockquote box.

                  // Removing the trigger text from the first paragraph
                  const cleanChildren = [
                    <div key="callout-content" className="callout-content">
                      {/* We can't easily modify the children props here without cloning. 
                          For a perfect solution, a remark plugin is better, 
                          but here we just apply the style to the container 
                          and maybe hide the trigger text via CSS or just leave it for now 
                          (Obsidian renders the title separately). 
                      */}
                      {/* Better approach: Clone the first paragraph and replace its text? 
                           Or simpler: Just render the Box style. The User sees [!INFO] text, 
                           which is acceptable as a fallback, or we can use CSS to hide it if we wrap it?
                       */}
                      {/* Let's try to remove the trigger string from display if possible */}
                      {Array.isArray(children)
                        ? children.map((child, idx) => {
                            if (idx === 0 && typeof child?.props?.children === 'string') {
                              const remainingText = child.props.children.replace(/^\[!(\w+)\](?: (.*))?(\n|$)/, '');
                              if (!remainingText.trim() && !title) return null; // Empty body
                              // If title exists, we already used it.
                              return (
                                <p key={idx} {...child.props}>
                                  {remainingText}
                                </p>
                              );
                            }
                            return child;
                          })
                        : children}
                    </div>,
                  ];

                  return (
                    <div
                      className="callout"
                      style={{
                        borderLeftColor: variant.color,
                        backgroundColor: `${variant.color}1a`, // 10% opacity fallback
                      }}
                    >
                      <div className="callout-title" style={{ color: variant.color }}>
                        <span>{variant.icon}</span>
                        {title || type.toUpperCase()}
                      </div>
                      {cleanChildren}
                    </div>
                  );
                }
              }

              return <blockquote {...props} />;
            },
          }}
        >
          {value}
        </ReactMarkdown>
      </div>
    </div>
  );
};
