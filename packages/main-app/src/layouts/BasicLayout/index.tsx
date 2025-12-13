import { type ReactNode, useEffect, useState } from 'react';
import { useUser } from '../../context/UserContext';
import { fetchRemoteMenus } from '../../services/menuService';
import type { MenuItem } from '../../types/menu';
import HeaderBar from './components/HeaderBar';
import PageNav from './components/PageNav';
import { builtInAsideMenus } from './menuConfig';

export default function BasicLayout({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const { user, loading } = useUser();
  const [menus, setMenus] = useState<MenuItem[]>(builtInAsideMenus);

  // 核心鉴权逻辑：如果没有用户信息且加载已完成，强制跳转登录
  useEffect(() => {
    if (!loading && !user) {
      // 记录当前 URL 以便登录后跳转回来
      const currentUrl = window.location.href;
      const isDev = process.env.NODE_ENV === 'development';
      const authBase = isDev ? 'http://localhost:5183' : `${window.location.origin}/auth-app`;
      window.location.href = `${authBase}/#/login?redirect=${encodeURIComponent(currentUrl)}`;
    }
  }, [user, loading]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 菜单加载逻辑
  useEffect(() => {
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
  }, [user]);

  // 如果正在检查登录状态，或者未登录（即将跳转），显示全屏 Loading 或空状态，避免闪屏
  if (loading || !user) {
    return null; // 或者返回一个全屏 Loading 组件
  }

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col">
      {/* 1) Header always on top */}
      <HeaderBar isMobile={isMobile} onMenuToggle={() => setIsNavOpen(true)} />

      {/* 2) Body: Left Dock + Main Stage */}
      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        <PageNav isMobile={isMobile} isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} menus={menus} />

        <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
          {/* The "Main Stage" - A floating glass card */}
          <main className="flex-1 p-4 md:p-6 overflow-hidden relative">
            <div className="w-full h-full rounded-[24px] bg-[var(--stage-bg)] backdrop-blur-xl border border-[var(--glass-border)] shadow-[var(--stage-shadow)] overflow-hidden flex flex-col transition-all duration-300">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
