import type { ReactNode } from 'react';
import HeaderBar from './components/HeaderBar';
import PageNav from './components/PageNav';

type BasicLayoutProps = {
  children: ReactNode;
  pathname?: string;
};

export default function BasicLayout({ children }: BasicLayoutProps) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-300">
      <HeaderBar />
      <div className="flex flex-1 overflow-hidden">
        <PageNav />
        <main className="flex-1 overflow-auto px-8 py-10">{children}</main>
      </div>
    </div>
  );
}
