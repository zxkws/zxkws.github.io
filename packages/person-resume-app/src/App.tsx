import type { ReactNode } from 'react';
import './styles.css';
import { Section, Pill } from './components/Section';
import { education, experiences, profile, projects, skillGroups, workingStyle } from './data/resume';

type AppProps = {
  basename?: string;
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="stat">
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);

const BulletList = ({ items }: { items: string[] }) => (
  <ul className="bullets">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

const TagLine = ({ items }: { items: string[] }) => (
  <div className="tagline">
    {items.map((item) => (
      <span key={item} className="tagline-item">
        {item}
      </span>
    ))}
  </div>
);

const Card = ({
  title,
  meta,
  children,
  footer,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) => (
  <div className="card">
    <div className="card-header">
      <div>
        <p className="card-kicker">Experience</p>
        <h3>{title}</h3>
        {meta ? <p className="card-meta">{meta}</p> : null}
      </div>
    </div>
    <div className="card-body">{children}</div>
    {footer ? <div className="card-footer">{footer}</div> : null}
  </div>
);

export default function App(_props: AppProps) {
  return (
    <div className="page">
      <div className="page-ambient" aria-hidden="true" />
      <div className="page-inner">
        <header className="hero">
          <div className="hero-text">
            <span className="eyebrow">Privacy-safe Resume</span>
            <h1>{profile.alias}</h1>
            <p className="headline">{profile.title}</p>
            <p className="subline">{profile.headline}</p>
            <TagLine items={[profile.metrics[1].value, profile.metrics[2].value, profile.metrics[3].value]} />
            <div className="stat-row">
              {profile.metrics.map((metric) => (
                <Stat key={metric.label} label={metric.label} value={metric.value} />
              ))}
            </div>
          </div>
        </header>

        <Section title="职业概览" hint="B 端 / 平台类产品为主">
          <div className="grid two">
            <div className="panel">
              <p className="panel-title">核心速览</p>
              <BulletList items={profile.summary} />
            </div>
            <div className="panel">
              <p className="panel-title">工作习惯</p>
              <BulletList items={workingStyle} />
            </div>
          </div>
        </Section>

        <Section title="技能版图" hint="覆盖框架、工程、质量保障">
          <div className="grid two">
            {skillGroups.map((group) => (
              <div key={group.name} className="skill-group">
                <div className="skill-title">{group.name}</div>
                <div className="skill-chips">
                  {group.items.map((item) => (
                    <Pill key={item} label={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="经历亮点" hint="按时间顺序展示主要职责与成果">
          <div className="timeline">
            {experiences.map((exp) => (
              <Card key={exp.period + exp.org} title={`${exp.org} · ${exp.role}`} meta={exp.period}>
                <BulletList items={exp.highlights} />
                <div className="pill-row">
                  {exp.tech.map((item) => (
                    <Pill key={item} label={item} />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="精选项目" hint="与岗位契合度高的交付记录">
          <div className="grid three">
            {projects.map((proj) => (
              <div key={proj.name} className="project">
                <p className="project-kicker">{proj.focus}</p>
                <h3>{proj.name}</h3>
                <BulletList items={proj.outcomes} />
                <div className="pill-row">
                  {proj.stack.map((item) => (
                    <Pill key={item} label={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="教育与诚信">
          <div className="education">
            <div>
              <p className="education-degree">{education.degree}</p>
              <p className="education-meta">{education.graduation}</p>
              <p className="education-note">{education.note}</p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
