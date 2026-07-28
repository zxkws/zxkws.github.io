import { type FormEvent, type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n';
import { submitContactRequest } from '../../services/contactService';
import ContactRichEditor, { type ContactEditorValue } from './ContactRichEditor';
import * as styles from './index.module.css';

const POSITION_STORAGE_KEY = 'lightspace-contact-position';
const VIEWPORT_GAP = 8;
const EMPTY_EDITOR: ContactEditorValue = { html: '', text: '', imageTokens: [] };
const STORAGE_ORIGIN = 'https://tg.lookli.nyc.mn';

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

const warmStorageConnection = () => {
  if (document.head.querySelector(`link[rel="preconnect"][href="${STORAGE_ORIGIN}"]`)) return;
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = STORAGE_ORIGIN;
  preconnect.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect);
};

export default function ContactSupport() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [editor, setEditor] = useState<ContactEditorValue>(EMPTY_EDITOR);
  const [editorResetKey, setEditorResetKey] = useState(0);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [company, setCompany] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [position, setPosition] = useState<TriggerPosition | null>(readStoredPosition);
  const [dragging, setDragging] = useState(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dragState = useRef<DragState | null>(null);
  const suppressClick = useRef(false);

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
    warmStorageConnection();
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || uploadingImages) return;
    if (editor.text.length < 5 || editor.text.length > 4000) {
      setError(t('contact.messageLengthError'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitContactRequest({
        email: email.trim(),
        message: editor.text,
        messageHtml: editor.html,
        company,
        imageTokens: editor.imageTokens,
      });
      setSent(true);
      setEmail('');
      setEditor(EMPTY_EDITOR);
      setEditorResetKey((current) => current + 1);
      setCompany('');
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

                <span className={styles.fieldLabel}>{t('contact.message')}</span>
                <ContactRichEditor
                  ariaLabel={t('contact.message')}
                  disabled={submitting}
                  placeholder={t('contact.messagePlaceholder')}
                  resetKey={editorResetKey}
                  t={t}
                  onChange={setEditor}
                  onError={setError}
                  onUploadingChange={setUploadingImages}
                />
                <span className={styles.pasteHint}>{t('contact.pasteImageHint')}</span>
                <span className={styles.counter}>{editor.text.length}/4000</span>

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

                <button type="submit" className={styles.primaryButton} disabled={submitting || uploadingImages}>
                  {uploadingImages
                    ? t('contact.imageUploading')
                    : submitting
                      ? t('contact.sending')
                      : t('contact.submit')}
                </button>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
