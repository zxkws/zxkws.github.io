import { useEffect, useState, type ReactNode } from 'react';
import HeaderBar from './components/HeaderBar';
import PageNav from './components/PageNav';

type BasicLayoutProps = {
  children: ReactNode;
  pathname?: string;
};

export default function BasicLayout({ children }: BasicLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return undefined;
    }

    const media = window.matchMedia('(max-width: 900px)');
    const apply = (matches: boolean) => {
      setIsMobile(matches);
      if (matches) {
        // 移动端不使用折叠，保持侧栏可见，由抽屉开合控制
        setIsNavCollapsed(false);
      } else {
        // 桌面关闭抽屉态
        setIsNavOpen(false);
      }
    };

    apply(media.matches);

    const handler = (event: MediaQueryListEvent) => apply(event.matches);

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handler);
    } else if (typeof media.addListener === 'function') {
      media.addListener(handler);
    }

    return () => {
      if (typeof media.removeEventListener === 'function') {
        media.removeEventListener('change', handler);
      } else if (typeof media.removeListener === 'function') {
        media.removeListener(handler);
      }
    };
  }, []);

  const toggleNav = () => setIsNavOpen((open) => !open);
  const closeNav = () => setIsNavOpen(false);
  const toggleDesktopNav = () => setIsNavCollapsed((prev) => !prev);

  const shouldShowNav = isMobile || !isNavCollapsed;

  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-300">
      <HeaderBar
        isMobile={isMobile}
        isNavOpen={isNavOpen}
        onMenuToggle={toggleNav}
        onDesktopNavToggle={toggleDesktopNav}
        isNavCollapsed={isNavCollapsed}
      />
      <div className="flex flex-1 overflow-hidden">
        {shouldShowNav && <PageNav isMobile={isMobile} isOpen={isNavOpen} onClose={closeNav} />}
        <main className="flex flex-1 min-h-0 flex-col overflow-hidden px-8 py-10" aria-hidden={isMobile && isNavOpen}>
          {children}
        </main>
      </div>
    </div>
  );
}
