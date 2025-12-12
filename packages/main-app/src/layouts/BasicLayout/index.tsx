import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useUser } from '../../context/UserContext';
import { fetchRemoteMenus } from '../../services/menuService';
import type { MenuItem } from '../../types/menu';
import HeaderBar from './components/HeaderBar';
import PageNav from './components/PageNav';
import { builtInAsideMenus } from './menuConfig';

// 游客模式下需要隐藏的敏感菜单路径
const GUEST_HIDDEN_PATHS = ['/app/user-admin', '/app/permission-admin'];

export default function BasicLayout({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const { user, isGuest } = useUser();
  const [menus, setMenus] = useState<MenuItem[]>(builtInAsideMenus);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 菜单加载逻辑
  useEffect(() => {
    // 游客模式：使用内置菜单，过滤掉管理员页面
    if (isGuest) {
      const guestMenus = builtInAsideMenus.filter((m) => !m.path || !GUEST_HIDDEN_PATHS.includes(m.path));
      setMenus(guestMenus);
      return;
    }

    // 正式用户：尝试拉取远程菜单
    if (user) {
      let mounted = true;
      fetchRemoteMenus(true)
        .then((remote) => {
          if (!mounted) return;
          if (remote && remote.length > 0) {
            setMenus(remote);
          } else {
            setMenus(builtInAsideMenus);
          }
        })
        .catch(() => {
          if (mounted) setMenus(builtInAsideMenus);
        });
      return () => {
        mounted = false;
      };
    }

    // 未登录：仅显示公开页面 (这里可以根据需求调整，比如未登录只给看 Home)
    // 但因为我们想推 PLG，未登录时可能只有 Home 和 Demo App
    // 简单起见，未登录时展示基础菜单供浏览
    setMenus(builtInAsideMenus.filter((m) => !GUEST_HIDDEN_PATHS.includes(m.path || '')));
  }, [user, isGuest]);

  return (
    <div className="flex w-full h-full relative overflow-hidden">
      {/* 1. Left Dock (Desktop) / Drawer (Mobile) */}
      <PageNav isMobile={isMobile} isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} menus={menus} />

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
