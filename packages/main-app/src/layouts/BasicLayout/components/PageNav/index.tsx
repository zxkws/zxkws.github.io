import { useEffect, useState } from 'react';
import SafeAppLink from '../../../../components/SafeAppLink';
import type { MenuItem } from '../../../../types/menu';
import * as styles from './index.module.css';

type PageNavProps = {
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
  menus: MenuItem[];
};

const getIcon = (name: string) => {
  const cleaned = name.trim();
  const map: Record<string, string> = {
    首页: '🏠',
    Vue应用: '⚡',
    React应用: '⚛️',
    用户管理: '👥',
    个人资料: '👤',
    Agent任务: '🤖',
    文本比对: '📝',
    Curl转换: '🔄',
    象棋·镜: '🪞',
    象棋: '🪞',
  };
  if (map[cleaned]) {
    return map[cleaned];
  }
  const first = cleaned.charAt(0);
  return first || '📌';
};

const PageNav = ({ isMobile, isOpen, onClose, menus }: PageNavProps) => {
  const [activePath, setActivePath] = useState('');

  useEffect(() => {
    const readPathname = () => window.location.pathname;

    setActivePath(readPathname());
    const onMainRouteChange = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === 'string') {
        setActivePath(detail);
        return;
      }
      setActivePath(readPathname());
    };

    window.addEventListener('main-route-change', onMainRouteChange as EventListener);
    return () => {
      window.removeEventListener('main-route-change', onMainRouteChange as EventListener);
    };
  }, []);

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === '/' && activePath === '/') return true;
    return path !== '/' && activePath.startsWith(path);
  };

  const renderItems = (items: MenuItem[]) => {
    return items.map((item) => {
      if (item.children?.length) {
        // Flatten children for Dock style simplicity, or use a popover (simplified here to flatten)
        return (
          <div key={item.name} style={{ display: 'contents' }}>
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
          className={`${styles.dockItem} ${active ? styles.dockItemActive : ''}`}
          onClick={isMobile ? onClose : undefined}
        >
          <div className={styles.iconBox}>{getIcon(item.name || '')}</div>
          <span className={styles.label}>{item.name}</span>
        </SafeAppLink>
      );
    });
  };

  if (isMobile) {
    return (
      <>
        <button
          className={`${styles.mobileOverlay} ${isOpen ? styles.mobileOverlayOpen : ''}`}
          onClick={onClose}
          type="button"
          aria-label="Close menu"
        />
        <nav className={`${styles.mobileDrawer} ${isOpen ? styles.mobileDrawerOpen : ''}`}>
          <div style={{ marginBottom: 24, fontSize: 18, fontWeight: 700 }}>Menu</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{renderItems(menus)}</div>
        </nav>
      </>
    );
  }

  return <nav className={styles.dockContainer}>{renderItems(menus)}</nav>;
};

export default PageNav;
