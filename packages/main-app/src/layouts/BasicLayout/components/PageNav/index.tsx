import { useEffect, useState } from 'react';
import AppIcon, { resolveAppIcon } from '../../../../components/AppIcon';
import SafeAppLink from '../../../../components/SafeAppLink';
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
      if (item.children?.length) {
        return (
          <div className={styles.nestedGroup} key={item.name}>
            <span className={styles.groupLabel}>{item.name}</span>
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
          title={item.name}
          className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
          onClick={isMobile ? onClose : undefined}
          aria-current={active ? 'page' : undefined}
        >
          <span className={styles.iconBox}>
            <AppIcon name={resolveAppIcon(item.path, item.name)} size={17} />
          </span>
          <span className={styles.label}>{item.name}</span>
        </SafeAppLink>
      );
    });

  const navigation = (
    <>
      <div className={styles.navHeading}>
        <div>
          <span className={styles.eyebrow}>CONTROL CENTER</span>
          <strong>工作台</strong>
        </div>
        {isMobile && (
          <button className={styles.closeButton} type="button" onClick={onClose} aria-label="关闭工作台菜单">
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
        <span>快速跳转</span>
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
          aria-label="关闭工作台菜单"
        />
        <nav className={`${styles.mobileDrawer} ${isOpen ? styles.mobileDrawerOpen : ''}`} aria-label="工作台功能">
          {navigation}
        </nav>
      </>
    );
  }

  return (
    <nav className={styles.sidebar} aria-label="工作台功能">
      {navigation}
    </nav>
  );
};

export default PageNav;
