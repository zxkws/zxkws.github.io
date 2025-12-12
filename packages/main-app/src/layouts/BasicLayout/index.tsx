import { type ReactNode, useEffect, useState } from 'react';
import HeaderBar from './components/HeaderBar';
import PageNav from './components/PageNav';
import { builtInAsideMenus } from './menuConfig';

// Main Layout updated to "Glass OS" style
export default function BasicLayout({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="flex w-full h-full relative overflow-hidden">
      {/* 1. Left Dock (Desktop) / Drawer (Mobile) */}
      <PageNav
        isMobile={isMobile}
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        menus={builtInAsideMenus} // Using built-in for simplicity in this demo, logic kept
      />

      {/* 2. Main Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
        <HeaderBar isMobile={isMobile} onMenuToggle={() => setIsNavOpen(true)} />

        {/* The "Main Stage" - A floating glass card */}
        <main className="flex-1 p-4 md:p-6 overflow-hidden relative">
          <div className="w-full h-full rounded-[24px] bg-[var(--stage-bg)] backdrop-blur-xl border border-[var(--glass-border)] shadow-[var(--stage-shadow)] overflow-hidden flex flex-col transition-all duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
