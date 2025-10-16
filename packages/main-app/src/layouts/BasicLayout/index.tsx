import type { ReactNode } from 'react';
import HeaderBar from './components/HeaderBar';
import PageNav from './components/PageNav';

type BasicLayoutProps = {
  children: ReactNode;
  pathname?: string;
};

export default function BasicLayout({ children }: BasicLayoutProps) {
  return (
    <div className="flex min-h-full w-full flex-1 flex-col bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-300">
      <HeaderBar />
      <div className="flex flex-1">
        <PageNav />
        <main className="flex flex-1 flex-col overflow-auto px-8 py-10">
          <div className="mx-auto w-full max-w-5xl flex-1">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
