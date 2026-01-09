import { Github, Mail, MapPin, Phone } from 'lucide-react';
import type { ResumeData } from '../data/resume';

type Props = {
  data: ResumeData;
  className?: string;
};

function joinClassName(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ');
}

export default function ResumePreview({ data, className }: Props) {
  const githubHref = data.profile.contact.github
    ? data.profile.contact.github.startsWith('http')
      ? data.profile.contact.github
      : `https://${data.profile.contact.github}`
    : '';

  return (
    <div
      className={joinClassName(
        'bg-white dark:bg-slate-800 shadow-xl print:shadow-none print:bg-white rounded-lg overflow-hidden',
        className,
      )}
    >
      {/* Header */}
      <header className="px-6 py-6 md:px-8 border-b border-slate-200 dark:border-slate-700 print:px-0 print:py-3 print:border-b-2 print:border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 print:flex-row print:items-end">
          <div className="flex-1">
            <h1 className="text-3xl md:text-[34px] font-extrabold text-slate-900 dark:text-white tracking-tight mb-1 print:text-black">
              {data.profile.name}
            </h1>
            <p className="text-lg text-slate-700 dark:text-slate-200 font-semibold mb-3 print:text-black">
              {data.profile.title}
            </p>
            <p className="text-[12px] leading-snug text-slate-600 dark:text-slate-300 max-w-2xl print:text-[11px] print:text-black">
              {data.profile.summary}
            </p>
          </div>

          {/* Contact + Education */}
          <div className="min-w-[210px] text-[12px] text-slate-600 dark:text-slate-300 print:text-black">
            <div className="flex flex-col gap-1.5">
              {data.profile.contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={12} className="text-slate-500 print:text-black" />
                  <span>{data.profile.contact.phone}</span>
                </div>
              )}
              {data.profile.contact.email && (
                <div className="flex items-center gap-2">
                  <Mail size={12} className="text-slate-500 print:text-black" />
                  <a
                    href={`mailto:${data.profile.contact.email}`}
                    className="hover:text-slate-900 dark:hover:text-white underline decoration-slate-300 underline-offset-2 print:no-underline"
                  >
                    {data.profile.contact.email}
                  </a>
                </div>
              )}
              {data.profile.contact.github && (
                <div className="flex items-center gap-2">
                  <Github size={12} className="text-slate-500 print:text-black" />
                  <a
                    href={githubHref}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-slate-900 dark:hover:text-white underline decoration-slate-300 underline-offset-2 print:no-underline"
                  >
                    {data.profile.contact.github}
                  </a>
                </div>
              )}
              {data.profile.contact.location && (
                <div className="flex items-center gap-2">
                  <MapPin size={12} className="text-slate-500 print:text-black" />
                  <span>{data.profile.contact.location}</span>
                </div>
              )}
            </div>

            <div className="my-2 border-t border-slate-200 dark:border-slate-600 print:border-slate-300" />

            <div>
              <div className="font-semibold text-slate-700 dark:text-slate-200 print:text-black">{data.education.school}</div>
              <div className="text-[12px] text-slate-600 dark:text-slate-300 print:text-black">{data.education.degree}</div>
              <div className="text-[12px] text-slate-500 dark:text-slate-400 font-mono tracking-wide print:text-black">
                {data.education.period}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-6 py-6 md:px-8 md:py-6 space-y-6 print:max-w-none print:px-0 print:py-4">
        {/* Skills */}
        <section>
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-wider mb-3 pb-1 border-b border-slate-300 dark:border-slate-600 print:border-slate-800 print:text-black">
            技术栈
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6 gap-y-3">
            {data.skillGroups.map((group, idx) => (
              <div key={idx}>
                <h3 className="text-[12px] font-bold text-slate-700 dark:text-slate-200 mb-1 print:text-black">
                  {group.name}
                </h3>
                <ul className="space-y-0.5">
                  {group.items.map((skill, i) => (
                    <li
                      key={i}
                      className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug print:text-black"
                    >
                      • {skill}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Experience */}
        <section>
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-wider mb-3 pb-1 border-b border-slate-300 dark:border-slate-600 print:border-slate-800 print:text-black">
            工作经历
          </h2>
          <div className="space-y-4">
            {data.experiences.map((exp, idx) => (
              <div
                key={idx}
                className="relative pl-3 border-l border-slate-200 dark:border-slate-700 print:border-l-0 print:pl-0"
              >
                <div className="absolute -left-[6px] top-1 w-2.5 h-2.5 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-400 print:hidden" />

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-[13px] print:text-black">{exp.org}</h3>
                    <p className="text-[12px] text-slate-700 dark:text-slate-200 font-semibold print:text-black">
                      {exp.role}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-300 font-mono tracking-wide print:text-black">
                    {exp.period}
                  </p>
                </div>

                <ul className="mt-2 list-disc list-outside ml-4 space-y-0.5 text-[12px] text-slate-700 dark:text-slate-300 leading-snug print:text-black">
                  {exp.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {exp.tech.map((t, i) => (
                    <span key={i} className="pill print:border-slate-300 print:text-black print:bg-transparent">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
