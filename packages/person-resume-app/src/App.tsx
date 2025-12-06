import type { ReactNode } from 'react';
import './styles.css';
import { Section, Pill } from './components/Section';
import { education, experiences, profile, projects, skillGroups, workingStyle } from './data/resume';

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col items-center p-3 bg-white dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/5 backdrop-blur-sm hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none">
    <div className="text-xl font-bold text-indigo-600 dark:text-indigo-300 tabular-nums">{value}</div>
    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium mt-0.5">
      {label}
    </div>
  </div>
);

const BulletList = ({ items }: { items: string[] }) => (
  <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
    {items.map((item, idx) => (
      <li key={idx} className="flex items-start gap-2">
        <span className="mt-1.5 w-1 h-1 rounded-full bg-indigo-500 shrink-0 opacity-70" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const TagLine = ({ items }: { items: string[] }) => (
  <div className="flex flex-wrap gap-1.5 justify-center md:justify-start my-4">
    {items.map((item) => (
      <span
        key={item}
        className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-medium"
      >
        {item}
      </span>
    ))}
  </div>
);

const Card = ({
  title,
  subtitle,
  meta,
  children,
  tags,
}: {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  children: ReactNode;
  tags?: string[];
}) => (
  <div className="group relative pl-6 pb-6 border-l border-slate-200 dark:border-white/10 last:pb-0">
    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500 group-hover:bg-indigo-500 transition-colors shadow-[0_0_0_3px_#f8fafc] dark:shadow-[0_0_0_3px_#020617]" />
    <div className="group-hover:translate-x-1 transition-transform duration-300">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-sm text-indigo-600 dark:text-indigo-300 font-medium">{subtitle}</p>}
        </div>
        {meta && (
          <div className="text-xs font-mono text-slate-500 dark:text-slate-500 whitespace-nowrap bg-slate-100 dark:bg-slate-900/50 px-1.5 py-0.5 rounded">
            {meta}
          </div>
        )}
      </div>
      <div className="mb-3">{children}</div>
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-white/5 opacity-80 hover:opacity-100 transition-opacity">
          {tags.map((tag) => (
            <Pill key={tag} label={tag} />
          ))}
        </div>
      )}
    </div>
  </div>
);

const ProjectCard = ({
  name,
  focus,
  outcomes,
  stack,
}: {
  name: string;
  focus: string;
  outcomes: string[];
  stack: string[];
}) => (
  <div className="card h-full flex flex-col p-4">
    <div className="mb-3">
      <div className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-0.5">
        {focus}
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
        {name}
      </h3>
    </div>
    <div className="flex-1 mb-4">
      <BulletList items={outcomes} />
    </div>
    <div className="flex flex-wrap gap-1.5 mt-auto pt-3 border-t border-slate-100 dark:border-white/5">
      {stack.map((item) => (
        <Pill key={item} label={item} />
      ))}
    </div>
  </div>
);

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 selection:bg-indigo-500/30 pb-12 transition-colors duration-300">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-200/40 dark:bg-indigo-900/20 blur-[80px] mix-blend-multiply dark:mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-200/40 dark:bg-blue-900/10 blur-[80px] mix-blend-multiply dark:mix-blend-screen" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        {/* Hero Section - Compact */}
        <header className="mb-10 text-center md:text-left grid md:grid-cols-[1.5fr_1fr] gap-8 items-center">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <span className="inline-block px-2 py-0.5 text-[10px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-100 dark:bg-indigo-500/10 rounded-full border border-indigo-200 dark:border-indigo-500/20">
                Privacy-safe Resume
              </span>
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
              {profile.alias}
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 font-light mb-1">{profile.title}</p>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg text-sm leading-relaxed mb-3 mx-auto md:mx-0">
              {profile.headline}
            </p>
            <TagLine items={[profile.metrics[1].value, profile.metrics[2].value, profile.metrics[3].value]} />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {profile.metrics.map((metric) => (
              <Stat key={metric.label} label={metric.label} value={metric.value} />
            ))}
          </div>
        </header>

        <div className="space-y-10">
          {/* Summary Section */}
          <Section title="职业概览" hint="B 端 / 平台类产品为主">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="text-indigo-500">✦</span> 核心速览
                </h3>
                <BulletList items={profile.summary} />
              </div>
              <div className="card">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="text-indigo-500">✦</span> 工作习惯
                </h3>
                <BulletList items={workingStyle} />
              </div>
            </div>
          </Section>

          {/* Skills Section */}
          <Section title="技能版图" hint="覆盖框架、工程、质量保障">
            <div className="grid md:grid-cols-2 gap-4">
              {skillGroups.map((group) => (
                <div
                  key={group.name}
                  className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="text-sm font-bold text-slate-900 dark:text-white mb-2">{group.name}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <Pill key={item} label={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Experience Section */}
          <Section title="经历亮点" hint="按时间顺序展示主要职责与成果">
            <div className="ml-2 md:ml-3 pt-2">
              {experiences.map((exp) => (
                <Card key={exp.period + exp.org} title={exp.org} subtitle={exp.role} meta={exp.period} tags={exp.tech}>
                  <BulletList items={exp.highlights} />
                </Card>
              ))}
            </div>
          </Section>

          {/* Projects Section */}
          <Section title="精选项目" hint="与岗位契合度高的交付记录">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((proj) => (
                <ProjectCard
                  key={proj.name}
                  name={proj.name}
                  focus={proj.focus}
                  outcomes={proj.outcomes}
                  stack={proj.stack}
                />
              ))}
            </div>
          </Section>

          {/* Education Section */}
          <Section title="教育与诚信">
            <div className="card flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-500/10 dark:to-transparent border-dashed">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{education.degree}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-0.5">{education.graduation}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">{education.note}</p>
              </div>
              <div className="px-3 py-1.5 rounded bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-200 text-xs font-medium">
                Verified Credentials
              </div>
            </div>
          </Section>
        </div>

        <footer className="mt-16 text-center text-slate-400 dark:text-slate-600 text-xs pb-6">
          <p>
            © {new Date().getFullYear()} {profile.alias}. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
