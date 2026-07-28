import { type FormEvent, useEffect, useRef, useState } from 'react';
import { submitContactRequest } from '../../services/contactService';
import * as styles from './index.module.css';

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
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const emailInput = useRef<HTMLInputElement>(null);

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

  const showForm = () => {
    setSent(false);
    setError(null);
    setOpen(true);
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
      });
      setSent(true);
      setEmail('');
      setMessage('');
      setCompany('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '发送失败，请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button type="button" className={styles.trigger} onClick={showForm} aria-label="联系客服">
        <ContactIcon />
        <span>联系客服</span>
      </button>

      {open ? (
        <div className={styles.backdrop}>
          <button type="button" className={styles.backdropClose} onClick={close} aria-label="关闭客服窗口" />
          <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="contact-dialog-title">
            <header className={styles.header}>
              <div>
                <p>CONTACT</p>
                <h2 id="contact-dialog-title">联系客服</h2>
              </div>
              <button type="button" className={styles.closeButton} onClick={close} aria-label="关闭">
                <CloseIcon />
              </button>
            </header>

            {sent ? (
              <div className={styles.success}>
                <span className={styles.successIcon}>✓</span>
                <h3>问题已经发送</h3>
                <p>我会通过你留下的邮箱回复。</p>
                <button type="button" className={styles.primaryButton} onClick={close}>
                  知道了
                </button>
              </div>
            ) : (
              <form className={styles.form} onSubmit={submit}>
                <p className={styles.description}>留下你的问题和邮箱，我会尽快回复。</p>

                <label htmlFor="contact-email">邮箱</label>
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

                <label htmlFor="contact-message">问题</label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="请描述你遇到的问题或想了解的内容"
                  minLength={5}
                  maxLength={4000}
                  rows={6}
                  required
                />
                <span className={styles.counter}>{message.length}/4000</span>

                <label className={styles.honeypot} htmlFor="contact-company">
                  公司
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
                  {submitting ? '正在发送…' : '发送问题'}
                </button>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
