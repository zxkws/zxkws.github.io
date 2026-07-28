import {
  type FormEvent,
  type MouseEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent as ReactDragEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { uploadContactImage } from '../../services/contactService';
import * as styles from './index.module.css';

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 1024 * 1024;
const TARGET_COMPRESSED_BYTES = 700 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export type ContactEditorValue = {
  html: string;
  text: string;
  imageTokens: string[];
};

type ContactRichEditorProps = {
  ariaLabel: string;
  disabled?: boolean;
  placeholder: string;
  resetKey: number;
  t: (key: string) => string;
  onChange: (value: ContactEditorValue) => void;
  onError: (message: string | null) => void;
  onUploadingChange: (uploading: boolean) => void;
};

const canvasBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    image.src = url;
  });

const prepareImage = async (file: File): Promise<File> => {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) throw new Error('type');
  if (file.size <= MAX_IMAGE_BYTES) return file;
  if (file.type === 'image/gif') throw new Error('size');

  const image = await loadImage(file);
  let scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
  let quality = 0.82;
  let compressed: Blob | null = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('decode');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    compressed = await canvasBlob(canvas, quality);
    if (compressed && compressed.size <= TARGET_COMPRESSED_BYTES) break;
    scale *= 0.78;
    quality = Math.max(0.5, quality - 0.08);
  }

  if (!compressed || compressed.size > MAX_IMAGE_BYTES) throw new Error('size');
  const stem = file.name.replace(/\.[^.]*$/, '') || 'pasted-image';
  return new File([compressed], `${stem}.webp`, { type: 'image/webp' });
};

const selectionRangeInside = (editor: HTMLElement): Range => {
  const selection = window.getSelection();
  if (selection?.rangeCount) {
    const active = selection.getRangeAt(0);
    if (editor.contains(active.commonAncestorContainer)) return active.cloneRange();
  }
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  return range;
};

const placeCaretAfter = (node: Node) => {
  const selection = window.getSelection();
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
};

const richTextToPlainText = (root: HTMLElement) => {
  const parts: string[] = [];
  const blockTags = new Set(['BLOCKQUOTE', 'DIV', 'FIGURE', 'LI', 'OL', 'P', 'UL']);
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent || '');
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === 'BR') {
      parts.push('\n');
      return;
    }
    Array.from(node.childNodes).forEach(visit);
    if (blockTags.has(node.tagName)) parts.push('\n');
  };
  Array.from(root.childNodes).forEach(visit);
  return parts
    .join('')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export default function ContactRichEditor({
  ariaLabel,
  disabled = false,
  placeholder,
  resetKey,
  t,
  onChange,
  onError,
  onUploadingChange,
}: ContactRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploads = useRef(0);
  const [uploadingCount, setUploadingCount] = useState(0);

  const syncValue = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const clone = editor.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-editor-control], [data-upload-placeholder]').forEach((node) => {
      node.remove();
    });
    const imageTokens = Array.from(clone.querySelectorAll<HTMLElement>('[data-contact-token]'))
      .map((node) => node.dataset.contactToken || '')
      .filter(Boolean);
    onChange({
      html: clone.innerHTML.trim(),
      text: richTextToPlainText(clone),
      imageTokens: Array.from(new Set(imageTokens)),
    });
  };

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = '';
    pendingUploads.current = 0;
    setUploadingCount(0);
    onUploadingChange(false);
    onChange({ html: '', text: '', imageTokens: [] });
  }, [resetKey]);

  useEffect(() => {
    onUploadingChange(uploadingCount > 0);
  }, [uploadingCount, onUploadingChange]);

  const insertNode = (node: Node, range?: Range) => {
    const editor = editorRef.current;
    if (!editor) return;
    const target = range ?? selectionRangeInside(editor);
    target.deleteContents();
    target.insertNode(node);
    placeCaretAfter(node);
  };

  const insertPlainText = (value: string) => {
    if (!value) return;
    insertNode(document.createTextNode(value));
  };

  const uploadedImageCount = () => editorRef.current?.querySelectorAll('[data-contact-token]').length ?? 0;

  const createPlaceholder = (label: string) => {
    const placeholderNode = document.createElement('span');
    placeholderNode.className = styles.uploadPlaceholder;
    placeholderNode.contentEditable = 'false';
    placeholderNode.dataset.uploadPlaceholder = 'true';
    placeholderNode.textContent = label;
    insertNode(placeholderNode);
    return placeholderNode;
  };

  const createImageFigure = (url: string, token: string, name: string) => {
    const figure = document.createElement('figure');
    figure.className = styles.inlineImage;
    figure.contentEditable = 'false';
    figure.dataset.contactFigure = 'true';

    const image = document.createElement('img');
    image.src = url;
    image.alt = name;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.dataset.contactToken = token;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = styles.inlineImageRemove;
    remove.dataset.editorControl = 'true';
    remove.dataset.removeImage = 'true';
    remove.setAttribute('aria-label', t('contact.removeImage'));
    remove.textContent = '×';

    figure.append(image, remove);
    return figure;
  };

  const imageErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message === 'type') return t('contact.imageTypeError');
    if (error instanceof Error && error.message === 'size') return t('contact.imageSizeError');
    if (error instanceof Error && error.message === 'decode') return t('contact.imageReadError');
    return error instanceof Error && error.message ? error.message : t('contact.imageUploadError');
  };

  const addImages = async (files: File[]) => {
    onError(null);
    const remaining = MAX_IMAGES - uploadedImageCount() - pendingUploads.current;
    if (remaining <= 0) {
      onError(t('contact.imageCountError'));
      return;
    }
    const accepted = files.slice(0, remaining);
    if (accepted.length < files.length) onError(t('contact.imageCountError'));

    const tasks = accepted.map(async (file) => {
      const placeholderNode = createPlaceholder(t('contact.imageUploading'));
      pendingUploads.current += 1;
      setUploadingCount(pendingUploads.current);
      try {
        const prepared = await prepareImage(file);
        const uploaded = await uploadContactImage(prepared);
        const figure = createImageFigure(uploaded.url, uploaded.token, uploaded.name || prepared.name);
        if (placeholderNode.isConnected) {
          placeholderNode.replaceWith(figure);
          placeCaretAfter(figure);
        }
      } catch (error) {
        placeholderNode.remove();
        onError(imageErrorMessage(error));
      } finally {
        pendingUploads.current = Math.max(0, pendingUploads.current - 1);
        setUploadingCount(pendingUploads.current);
        syncValue();
      }
    });
    await Promise.all(tasks);
  };

  const handlePaste = (event: ReactClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    const text = event.clipboardData.getData('text/plain');
    if (text) insertPlainText(text);
    if (files.length) void addImages(files);
    syncValue();
  };

  const handleDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;
    event.preventDefault();
    void addImages(files);
  };

  const handleEditorClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const remove = target.closest<HTMLElement>('[data-remove-image]');
    if (!remove) return;
    remove.closest('[data-contact-figure]')?.remove();
    syncValue();
  };

  const runCommand = (event: MouseEvent<HTMLButtonElement>, command: 'bold' | 'italic' | 'insertUnorderedList') => {
    event.preventDefault();
    editorRef.current?.focus();
    document.execCommand(command);
    syncValue();
  };

  const handleInput = (_event: FormEvent<HTMLDivElement>) => {
    syncValue();
  };

  return (
    <div className={styles.editorShell}>
      <div className={styles.editorToolbar} role="toolbar" aria-label={t('contact.editorToolbar')}>
        <button
          type="button"
          aria-label={t('contact.bold')}
          title={t('contact.bold')}
          disabled={disabled}
          onMouseDown={(event) => runCommand(event, 'bold')}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          aria-label={t('contact.italic')}
          title={t('contact.italic')}
          disabled={disabled}
          onMouseDown={(event) => runCommand(event, 'italic')}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          aria-label={t('contact.bulletList')}
          title={t('contact.bulletList')}
          disabled={disabled}
          onMouseDown={(event) => runCommand(event, 'insertUnorderedList')}
        >
          •—
        </button>
        <button
          type="button"
          aria-label={t('contact.insertImage')}
          title={t('contact.insertImage')}
          disabled={disabled || uploadingCount > 0}
          onClick={() => fileInputRef.current?.click()}
        >
          ▧
        </button>
        {uploadingCount > 0 ? (
          <output className={styles.uploadingStatus} aria-live="polite">
            {t('contact.imageUploading')}
          </output>
        ) : null}
        <input
          ref={fileInputRef}
          className={styles.fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          tabIndex={-1}
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            event.target.value = '';
            if (files.length) void addImages(files);
          }}
        />
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: contentEditable requires a div so images can render inline. */}
      <div
        ref={editorRef}
        className={styles.editorArea}
        contentEditable={!disabled}
        role="textbox"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-multiline="true"
        data-placeholder={placeholder}
        suppressContentEditableWarning
        onClick={handleEditorClick}
        onKeyDown={(event) => {
          const target = event.target as HTMLElement;
          if (!target.closest('[data-remove-image]') || !['Enter', ' '].includes(event.key)) return;
          event.preventDefault();
          target.click();
        }}
        onDrop={handleDrop}
        onInput={handleInput}
        onPaste={handlePaste}
      />
    </div>
  );
}
