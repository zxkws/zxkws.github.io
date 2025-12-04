import type { ReactNode } from 'react';

type SectionProps = {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
};

export const Section = ({ title, hint, action, children }: SectionProps) => {
  return (
    <section className="mb-8 relative group">
      <div className="absolute -inset-2 rounded-xl bg-slate-100 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity -z-10 duration-500" />
      <header className="flex items-baseline justify-between mb-4 gap-3 border-b border-slate-200 dark:border-white/10 pb-2">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight relative inline-block">
            {title}
            <span className="absolute -bottom-2.5 left-0 w-full h-0.5 bg-indigo-500 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></span>
          </h2>
          {hint && <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">{hint}</p>}
        </div>
        {action && <div>{action}</div>}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
};

export const Pill = ({ label }: { label: string }) => <span className="pill">{label}</span>;
