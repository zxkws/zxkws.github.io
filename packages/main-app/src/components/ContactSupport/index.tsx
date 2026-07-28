import {
  type FormEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useLanguage } from '../../i18n';
import { submitContactRequest } from '../../services/contactService';
import * as styles from './index.module.css';

const POSITION_STORAGE_KEY = 'lightspace-contact-position';
const VIEWPORT_GAP = 8;
const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 2 * 1024 * 1024;
const TARGET_COMPRESSED_BYTES = 700 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

type ContactImageType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

type ContactImage = {
  id: string;
  name: string;
  type: ContactImageType;
  data: string;
  size: number;
};

type TriggerPosition = {
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  x: number;
  y: number;
  moved: boolean;
};

const readStoredPosition = (): TriggerPosition | null => {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(POSITION_STORAGE_KEY) ?? '');
    if (Number.isFinite(value?.x) && Number.isFinite(value?.y)) return value;
  } catch {
    // Ignore invalid local values and use the default bottom-right position.
  }
  return null;
};

const clampToViewport = (next: TriggerPosition, element: HTMLElement | null): TriggerPosition => {
  const rect = element?.getBoundingClientRect();
  const width = rect?.width ?? 44;
  const height = rect?.height ?? 44;
  return {
    x: Math.min(Math.max(VIEWPORT_GAP, next.x), Math.max(VIEWPORT_GAP, window.innerWidth - width - VIEWPORT_GAP)),
    y: Math.min(Math.max(VIEWPORT_GAP, next.y), Math.max(VIEWPORT_GAP, window.innerHeight - height - VIEWPORT_GAP)),
  };
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

const imageToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      const separator = value.indexOf(',');
      if (separator < 0) reject(new Error('decode'));
      else resolve(value.slice(separator + 1));
    };
    reader.onerror = () => reject(new Error('decode'));
    reader.readAsDataURL(file);
  });

const ContactIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 18.5 3.5 21v-5.2A8.5 8.5 0 1 1 7 18.5Z" />
    <path d="M8 10.5h8M8 14h5" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m7 7 10 10M17 7 7 17" />
  </svg>
);

export default function ContactSupport() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState('');
  const [images, setImages] = useState<ContactImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [position, setPosition] = useState<TriggerPosition | null>(readStoredPosition);
  const [dragging, setDragging] = useState(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dragState = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  const imagesRef = useRef<ContactImage[]>([]);

  const updateImages = (next: ContactImage[]) => {
    imagesRef.current = next;
    setImages(next);
  };

  const close = () => {
    if (submitting) return;
    setOpen(false);
    setError(null);
  };

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => emailInput.current?.focus(), 50);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, submitting]);

  useEffect(() => {
    const keepInsideViewport = () =>
      setPosition((current) => (current ? clampToViewport(current, triggerRef.current) : current));
    const frame = window.requestAnimationFrame(keepInsideViewport);
    window.addEventListener('resize', keepInsideViewport);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', keepInsideViewport);
    };
  }, []);

  const showForm = () => {
    setSent(false);
    setError(null);
    setOpen(true);
  };

  const handleTriggerClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    showForm();
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      x: rect.left,
      y: rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = dragState.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - current.startX;
    const deltaY = event.clientY - current.startY;
    if (!current.moved && Math.hypot(deltaX, deltaY) < 4) return;

    const next = clampToViewport({ x: current.originX + deltaX, y: current.originY + deltaY }, triggerRef.current);
    current.moved = true;
    current.x = next.x;
    current.y = next.y;
    setDragging(true);
    setPosition(next);
  };

  const finishDragging = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = dragState.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (current.moved) {
      const next = { x: current.x, y: current.y };
      window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(next));
      suppressClick.current = true;
    }
    dragState.current = null;
    setDragging(false);
  };

  const addPastedImages = async (files: File[]) => {
    setError(null);
    const next = [...imagesRef.current];
    for (const file of files) {
      if (next.length >= MAX_IMAGES) {
        setError(t('contact.imageCountError'));
        break;
      }
      try {
        const prepared = await prepareImage(file);
        const totalBytes = next.reduce((sum, image) => sum + image.size, 0) + prepared.size;
        if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
          setError(t('contact.imageTotalError'));
          break;
        }
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: prepared.name || `pasted-image-${next.length + 1}.png`,
          type: prepared.type as ContactImageType,
          data: await imageToBase64(prepared),
          size: prepared.size,
        });
      } catch (imageError) {
        setError(
          imageError instanceof Error && imageError.message === 'type'
            ? t('contact.imageTypeError')
            : imageError instanceof Error && imageError.message === 'size'
              ? t('contact.imageSizeError')
              : t('contact.imageReadError'),
        );
      }
    }
    updateImages(next);
  };

  const handleMessagePaste = (event: ReactClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (!files.length) return;
    event.preventDefault();
    void addPastedImages(files);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitContactRequest({
        email: email.trim(),
        message: message.trim(),
        company,
        images: images.map(({ name, type, data }) => ({ name, type, data })),
      });
      setSent(true);
      setEmail('');
      setMessage('');
      setCompany('');
      updateImages([]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('contact.sendFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${dragging ? styles.dragging : ''}`}
        style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined}
        onClick={handleTriggerClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDragging}
        onPointerCancel={finishDragging}
        aria-label={t('contact.open')}
      >
        <ContactIcon />
        <span>{t('contact.open')}</span>
      </button>

      {open ? (
        <div className={styles.backdrop}>
          <button
            type="button"
            className={styles.backdropClose}
            onClick={close}
            aria-label={t('contact.closeWindow')}
          />
          <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="contact-dialog-title">
            <header className={styles.header}>
              <div>
                <p>CONTACT</p>
                <h2 id="contact-dialog-title">{t('contact.open')}</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={close} aria-label={t('common.close')}>
                <CloseIcon />
              </button>
            </header>

            {sent ? (
              <div className={styles.success}>
                <span className={styles.successIcon}>✓</span>
                <h3>{t('contact.sentTitle')}</h3>
                <p>{t('contact.sentDescription')}</p>
                <button type="button" className={styles.primaryButton} onClick={close}>
                  {t('contact.acknowledge')}
                </button>
              </div>
            ) : (
              <form className={styles.form} onSubmit={submit}>
                <p className={styles.description}>{t('contact.description')}</p>

                <label htmlFor="contact-email">{t('contact.email')}</label>
                <input
                  ref={emailInput}
                  id="contact-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  maxLength={254}
                  required
                />

                <label htmlFor="contact-message">{t('contact.message')}</label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onPaste={handleMessagePaste}
                  placeholder={t('contact.messagePlaceholder')}
                  minLength={5}
                  maxLength={4000}
                  rows={6}
                  required
                />
                <span className={styles.pasteHint}>{t('contact.pasteImageHint')}</span>
                <span className={styles.counter}>{message.length}/4000</span>

                {images.length ? (
                  <ul className={styles.attachments} aria-label={t('contact.pastedImages')}>
                    {images.map((image) => (
                      <li className={styles.attachment} key={image.id}>
                        <img src={`data:${image.type};base64,${image.data}`} alt={image.name} />
                        <span title={image.name}>{image.name}</span>
                        <button
                          type="button"
                          onClick={() => updateImages(images.filter((item) => item.id !== image.id))}
                          aria-label={t('contact.removeImage')}
                          disabled={submitting}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <label className={styles.honeypot} htmlFor="contact-company">
                  {t('contact.company')}
                  <input
                    id="contact-company"
                    name="company"
                    type="text"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </label>

                {error ? (
                  <p className={styles.error} role="alert">
                    {error}
                  </p>
                ) : null}

                <button type="submit" className={styles.primaryButton} disabled={submitting}>
                  {submitting ? t('contact.sending') : t('contact.submit')}
                </button>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
