import { AppLink } from '@ice/stark';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { asideMenuConfig } from '../../menuConfig';
import * as styles from './index.module.css';

type MenuItem = {
  name: string;
  path?: string;
  icon?: string;
  children?: MenuItem[];
};

type MenuGroupState = Set<string>;

const ICON_SYMBOLS: Record<string, string> = {
  'chart-pie': '📊',
  account: '👤',
  atm: '🧩',
  set: '🧭',
};

const CX = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const getCurrentPath = () => {
  if (typeof window === 'undefined') {
    return '/';
  }
  const { pathname, hash } = window.location;
  if (hash && hash.startsWith('#/')) {
    return hash.slice(1);
  }
  return pathname || '/';
};

const isPathMatch = (target: string | undefined, current: string) => {
  if (!target) {
    return false;
  }
  if (target === '/') {
    return current === '/';
  }
  return current === target || current.startsWith(`${target}/`);
};

const menuItemHasActive = (item: MenuItem, current: string): boolean => {
  if (isPathMatch(item.path, current)) {
    return true;
  }
  if (item.children && item.children.length > 0) {
    return item.children.some((child) => menuItemHasActive(child, current));
  }
  return false;
};

const createKey = (item: MenuItem, parentKey: string, index: number) => {
  if (item.path) {
    return `${parentKey}::${item.path}`;
  }
  return `${parentKey}::${item.name ?? 'item'}-${index}`;
};

const collectExpandedKeys = (items: MenuItem[], current: string, parentKey = 'root'): string[] => {
  const collected: string[] = [];
  items.forEach((item, index) => {
    if (!item.children || item.children.length === 0) {
      return;
    }
    const key = createKey(item, parentKey, index);
    if (menuItemHasActive(item, current)) {
      collected.push(key);
    }
    const nested = collectExpandedKeys(item.children, current, key);
    collected.push(...nested);
  });
  return collected;
};

const getIconSymbol = (item: MenuItem) => {
  if (item.icon && ICON_SYMBOLS[item.icon]) {
    return ICON_SYMBOLS[item.icon];
  }
  const firstLetter = item.name?.trim().charAt(0);
  if (!firstLetter) {
    return '•';
  }
  return firstLetter.toUpperCase();
};

const isMicroAppEntry = (path?: string) => {
  if (!path) {
    return false;
  }
  return ['/seller', '/waiter', '/curlconverter'].some((prefix) => path.startsWith(prefix));
};

const PageNav = () => {
  const [activePath, setActivePath] = useState<string>(() => getCurrentPath());
  const [expandedGroups, setExpandedGroups] = useState<MenuGroupState>(() => {
    const keys = collectExpandedKeys(asideMenuConfig, getCurrentPath());
    return new Set(keys);
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handlePathChange = () => {
      setActivePath(getCurrentPath());
    };

    const historyRef = window.history;
    const originalPush = historyRef.pushState;
    const originalReplace = historyRef.replaceState;

    historyRef.pushState = ((...args) => {
      originalPush.apply(historyRef, args as Parameters<typeof originalPush>);
      handlePathChange();
    }) as History['pushState'];

    historyRef.replaceState = ((...args) => {
      originalReplace.apply(historyRef, args as Parameters<typeof originalReplace>);
      handlePathChange();
    }) as History['replaceState'];

    window.addEventListener('popstate', handlePathChange);
    window.addEventListener('hashchange', handlePathChange);

    return () => {
      historyRef.pushState = originalPush;
      historyRef.replaceState = originalReplace;
      window.removeEventListener('popstate', handlePathChange);
      window.removeEventListener('hashchange', handlePathChange);
    };
  }, []);

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      const requiredKeys = collectExpandedKeys(asideMenuConfig, activePath);
      requiredKeys.forEach((key) => next.add(key));
      return next;
    });
  }, [activePath]);

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const renderMenuItems = useCallback(
    (items: MenuItem[], parentKey = 'root'): ReactNode =>
      items.map((item, index) => {
        const key = createKey(item, parentKey, index);
        const hasChildren = !!item.children && item.children.length > 0;
        const isExpanded = expandedGroups.has(key);
        const active = isPathMatch(item.path, activePath);
        const hasActiveChild = hasChildren ? item.children!.some((child) => menuItemHasActive(child, activePath)) : false;
        const emblem = getIconSymbol(item);

        if (hasChildren) {
          return (
            <div key={key} className={styles.menuNode}>
              <button
                type="button"
                className={CX(
                  styles.groupToggle,
                  isExpanded && styles.groupToggleExpanded,
                  (active || hasActiveChild) && styles.groupToggleActive,
                )}
                onClick={() => toggleGroup(key)}
                aria-expanded={isExpanded}
                aria-controls={`${key}-children`}
              >
                <span className={styles.groupLabel}>
                  <span className={styles.emblem} aria-hidden="true">
                    {emblem}
                  </span>
                  {item.name}
                </span>
                <span className={CX(styles.chevron, isExpanded && styles.chevronOpen)} aria-hidden="true" />
              </button>
              <div
                id={`${key}-children`}
                className={CX(styles.childContainer, isExpanded && styles.childContainerVisible)}
              >
                {renderMenuItems(item.children!, key)}
              </div>
            </div>
          );
        }

        if (!item.path) {
          return null;
        }

        return (
          <AppLink
            key={key}
            to={item.path}
            className={CX(styles.navLink, active && styles.navLinkActive)}
            title={item.name}
          >
            <span className={styles.linkContent}>
              <span className={styles.emblem} aria-hidden="true">
                {emblem}
              </span>
              <span className={styles.linkText}>{item.name}</span>
            </span>
            {isMicroAppEntry(item.path) && <span className={styles.microBadge}>Micro</span>}
          </AppLink>
        );
      }),
    [activePath, expandedGroups, toggleGroup],
  );

  const menuContent = useMemo(() => renderMenuItems(asideMenuConfig), [renderMenuItems]);

  return (
    <nav className={styles.navContainer} aria-label="主导航">
      <div className={styles.navHeader}>
        <div className={styles.navTitle}>全局导航</div>
        <div className={styles.navSubtitle}>选择模块或进入微应用</div>
      </div>
      <div className={styles.navInner}>{menuContent}</div>
    </nav>
  );
};

export default PageNav;
