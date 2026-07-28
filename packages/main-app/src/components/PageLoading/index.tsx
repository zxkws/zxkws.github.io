import type { PropsWithChildren } from 'react';
import { useLanguage } from '../../i18n';
import * as styles from './index.module.css';

type PageLoadingProps = PropsWithChildren<{
  loading?: boolean;
  contained?: boolean;
}>;

const PageLoading = ({ children, loading = false, contained = false }: PageLoadingProps) => {
  const { t } = useLanguage();
  const isEmpty = !children;
  const overlay = loading ? (
    <output
      className={`${styles.overlay} ${contained || !isEmpty ? styles.contained : styles.fullscreen}`}
      aria-live="polite"
    >
      <div className={styles.card}>
        <span className={styles.spinner} aria-hidden="true" />
        <span>{t('common.loading')}</span>
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
