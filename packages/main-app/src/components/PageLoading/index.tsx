import type { PropsWithChildren } from 'react';
import * as styles from './index.module.css';

type PageLoadingProps = PropsWithChildren<{
  loading?: boolean;
  contained?: boolean;
}>;

const PageLoading = ({ children, loading = false, contained = false }: PageLoadingProps) => {
  const isEmpty = !children;
  const overlay = loading ? (
    <output
      className={`${styles.overlay} ${contained || !isEmpty ? styles.contained : styles.fullscreen}`}
      aria-live="polite"
    >
      <div className={styles.card}>
        <span className={styles.spinner} aria-hidden="true" />
        <span>正在加载…</span>
      </div>
    </output>
  ) : null;

  if (isEmpty) {
    return overlay;
  }

  return (
    <div className={styles.content} aria-busy={loading}>
      {children}
      {overlay}
    </div>
  );
};

export default PageLoading;
