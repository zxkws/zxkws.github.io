import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Note } from '../store';
import { useEffect, useRef, useState } from 'react';
import { uploadFile } from '../api';

const MAX_INLINE_FILE_SIZE = 5 * 1024 * 1024; // 5MB, avoid accidental huge embeds

export const Editor = ({
  note,
  onChange,
}: {
  note: Note;
  onChange: (md: string) => void;
}) => {
  const [value, setValue] = useState(note.contentMd);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

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
        const md = file.type.startsWith('image/')
          ? `![${safeName}](${url})\n`
          : `[${safeName}](${url})\n`;
        insertAtCursor(md);
      } catch (err) {
        console.warn('[notes-editor] upload failed, fallback to inline data url', err);
        try {
          const dataUrl = await fileToDataUrl(file);
          const safeName = file.name.replace(/\s+/g, ' ');
          const md = file.type.startsWith('image/')
            ? `![${safeName}](${dataUrl})\n`
            : `[${safeName}](${dataUrl})\n`;
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

  return (
    <div className="editor">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
      <div className="preview">
        <ReactMarkdown
          remarkPlugins={[remarkGfm as any]}
          rehypePlugins={[[rehypeHighlight as any, { ignoreMissing: true }]]}
        >
          {value}
        </ReactMarkdown>
      </div>
    </div>
  );
};
