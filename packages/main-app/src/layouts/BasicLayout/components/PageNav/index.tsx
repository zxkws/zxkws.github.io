import { useEffect, useState } from 'react';
import AppIcon, { resolveAppIcon } from '../../../../components/AppIcon';
import SafeAppLink from '../../../../components/SafeAppLink';
import { useLanguage } from '../../../../i18n';
import type { MenuItem } from '../../../../types/menu';
import * as styles from './index.module.css';

type PageNavProps = {
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
  menus: MenuItem[];
};

const PageNav = ({ isMobile, isOpen, onClose, menus }: PageNavProps) => {
  const [activePath, setActivePath] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    const readPathname = () => window.location.pathname;
    const syncActivePath = (event?: Event) => {
      const detail = event ? (event as CustomEvent<string>).detail : undefined;
      setActivePath(typeof detail === 'string' ? detail : readPathname());
    };

    syncActivePath();
    window.addEventListener('main-route-change', syncActivePath as EventListener);
    return () => window.removeEventListener('main-route-change', syncActivePath as EventListener);
  }, []);

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === '/') return activePath === '/';
    return activePath === path || activePath.startsWith(`${path}/`);
  };

  const renderItems = (items: MenuItem[]) =>
    items.map((item) => {
      const label = item.i18nKey ? t(item.i18nKey) : item.name;
      if (item.children?.length) {
        return (
          <div className={styles.nestedGroup} key={item.name}>
            <span className={styles.groupLabel}>{label}</span>
            {renderItems(item.children)}
          </div>
        );
      }
      if (!item.path) return null;

      const active = isActive(item.path);
      return (
        <SafeAppLink
          key={item.path}
          to={item.path}
          title={label}
          className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
          onClick={isMobile ? onClose : undefined}
          aria-current={active ? 'page' : undefined}
        >
          <span className={styles.iconBox}>
            <AppIcon name={resolveAppIcon(item.path, item.name)} size={17} />
          </span>
          <span className={styles.label}>{label}</span>
        </SafeAppLink>
      );
    });

  const navigation = (
    <>
      <div className={styles.navHeading}>
        <div>
          <span className={styles.eyebrow}>CONTROL CENTER</span>
          <strong>{t('nav.workspace')}</strong>
        </div>
        {isMobile && (
          <button className={styles.closeButton} type="button" onClick={onClose} aria-label={t('nav.closeMenu')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </div>
      <div className={styles.navList}>{renderItems(menus)}</div>
      <button
        className={styles.commandHint}
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('main-app:open-command-palette'))}
      >
        <span>{t('nav.quickJump')}</span>
        <kbd>⌘ K</kbd>
      </button>
    </>
  );

  if (isMobile) {
    return (
      <>
        <button
          className={`${styles.mobileOverlay} ${isOpen ? styles.mobileOverlayOpen : ''}`}
          onClick={onClose}
          type="button"
          aria-label={t('nav.closeMenu')}
        />
        <nav
          className={`${styles.mobileDrawer} ${isOpen ? styles.mobileDrawerOpen : ''}`}
          aria-label={t('nav.features')}
        >
          {navigation}
        </nav>
      </>
    );
  }

  return (
    <nav className={styles.sidebar} aria-label={t('nav.features')}>
      {navigation}
    </nav>
  );
};

export default PageNav;
