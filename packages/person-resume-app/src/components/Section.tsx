import type { ReactNode } from 'react';

type SectionProps = {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
};

export const Section = ({ title, hint, action, children }: SectionProps) => {
  return (
    <section className="section-card">
      <header className="section-header">
        <div>
          <p className="section-kicker">Resume Capsule</p>
          <h2>{title}</h2>
          {hint ? <p className="section-hint">{hint}</p> : null}
        </div>
        {action ? <div className="section-action">{action}</div> : null}
      </header>
      <div className="section-body">{children}</div>
    </section>
  );
};

export const Pill = ({ label }: { label: string }) => <span className="pill">{label}</span>;
