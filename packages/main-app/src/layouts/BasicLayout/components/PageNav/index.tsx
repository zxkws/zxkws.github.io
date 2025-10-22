import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAsideMenuConfig } from '../../menuConfig';
import type { MenuItem } from '../../../../types/menu';
import * as styles from './index.module.css';
import SafeAppLink from '../../../../components/SafeAppLink';

type MenuGroupState = Set<string>;

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
  const firstLetter = item.name?.trim().charAt(0);
  return firstLetter ? firstLetter.toUpperCase() : '•';
};

const isMicroAppEntry = (path?: string) => {
  if (!path) {
    return false;
  }
  return ['/v-app', '/pdf-editor', '/textdiff', '/curlconverter', '/config-hub'].some((prefix) =>
    path.startsWith(prefix),
  );
};

const hijackHistory = (onChange: () => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const historyRef = window.history;
  const originalPush = historyRef.pushState.bind(historyRef);
  const originalReplace = historyRef.replaceState.bind(historyRef);

  historyRef.pushState = ((...args) => {
    originalPush(...args);
    onChange();
  }) as History['pushState'];

  historyRef.replaceState = ((...args) => {
    originalReplace(...args);
    onChange();
  }) as History['replaceState'];

  return () => {
    historyRef.pushState = originalPush;
    historyRef.replaceState = originalReplace;
  };
};

const registerMenuEvents = (onPathChange: () => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const pathHandler = () => onPathChange();

  window.addEventListener('popstate', pathHandler);
  window.addEventListener('hashchange', pathHandler);

  return () => {
    window.removeEventListener('popstate', pathHandler);
    window.removeEventListener('hashchange', pathHandler);
  };
};

const useMenuState = () => {
  const [activePath, setActivePath] = useState(getCurrentPath());
  const menuConfig = useMemo(() => getAsideMenuConfig(), []);
  const [expandedGroups, setExpandedGroups] = useState<MenuGroupState>(
    () => new Set(collectExpandedKeys(menuConfig, getCurrentPath())),
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const restoreHistory = hijackHistory(() => setActivePath(getCurrentPath()));
    const unregisterEvents = registerMenuEvents(() => setActivePath(getCurrentPath()));
    const routeChangeHandler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail) {
        setActivePath(detail);
      } else {
        setActivePath(getCurrentPath());
      }
    };

    window.addEventListener('main-route-change', routeChangeHandler);

    setActivePath(getCurrentPath());

    return () => {
      restoreHistory();
      unregisterEvents();
      window.removeEventListener('main-route-change', routeChangeHandler);
    };
  }, []);

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      collectExpandedKeys(menuConfig, activePath).forEach((key) => next.add(key));
      return next;
    });
  }, [activePath, menuConfig]);

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

  return { activePath, menuConfig, expandedGroups, toggleGroup };
};

const PageNav = () => {
  const { activePath, menuConfig, expandedGroups, toggleGroup } = useMenuState();

  const renderMenuItems = useCallback(
    (items: MenuItem[], parentKey = 'root'): ReactNode =>
      items.map((item, index) => {
        const key = createKey(item, parentKey, index);
        const hasChildren = !!item.children && item.children.length > 0;
        const isExpanded = expandedGroups.has(key);
        const active = isPathMatch(item.path, activePath);
        const hasActiveChild = hasChildren
          ? item.children!.some((child) => menuItemHasActive(child, activePath))
          : false;
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
          <SafeAppLink
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
          </SafeAppLink>
        );
      }),
    [activePath, expandedGroups, toggleGroup],
  );

  const menuContent = useMemo(() => renderMenuItems(menuConfig), [renderMenuItems, menuConfig]);

  return (
    <nav className={styles.navContainer} aria-label="主导航">
      <div className={styles.navInner}>{menuContent}</div>
    </nav>
  );
};

export default PageNav;
