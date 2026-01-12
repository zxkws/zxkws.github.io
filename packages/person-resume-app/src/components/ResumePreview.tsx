import { Github, Mail, MapPin, Phone } from 'lucide-react';
import type { ResumeData } from '../data/resume';

type Props = {
  data: ResumeData;
  className?: string;
};

function joinClassName(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ');
}

function nonEmpty(value: string) {
  return value.trim().length > 0;
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
        'resume-preview bg-white dark:bg-slate-800 shadow-xl print:shadow-none print:bg-white rounded-lg overflow-hidden print:text-black print:border-slate-800 print:[&_*]:text-black print:[&_*]:border-slate-800',
        className,
      )}
    >
      {/* Header */}
      <header className="px-6 py-6 md:px-8 border-b border-slate-200 dark:border-slate-700 print:border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="flex-1">
            <h1 className="text-3xl md:text-[34px] font-extrabold text-slate-900 dark:text-white tracking-tight mb-1 print:text-black">
              {data.profile.name}
            </h1>
            <p className="text-lg text-slate-800 dark:text-slate-200 font-semibold mb-3 print:text-black">
              {data.profile.title}
            </p>
            <p className="text-[12px] leading-snug text-slate-700 dark:text-slate-300 max-w-2xl print:text-black">
              {data.profile.summary}
            </p>
          </div>

          {/* Contact + Education */}
          <div className="min-w-[210px] text-[12px] text-slate-700 dark:text-slate-300 print:text-black">
            <div className="flex flex-col gap-1.5">
              {data.profile.contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={12} className="text-slate-700 print:text-black" />
                  <span>{data.profile.contact.phone}</span>
                </div>
              )}
              {data.profile.contact.email && (
                <div className="flex items-center gap-2">
                  <Mail size={12} className="text-slate-700 print:text-black" />
                  <a
                    href={`mailto:${data.profile.contact.email}`}
                    className="hover:text-slate-900 dark:hover:text-white decoration-slate-300 underline-offset-2 print:no-underline"
                  >
                    {data.profile.contact.email}
                  </a>
                </div>
              )}
              {data.profile.contact.github && (
                <div className="flex items-center gap-2">
                  <Github size={12} className="text-slate-700 print:text-black" />
                  <a
                    href={githubHref}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-slate-900 dark:hover:text-white decoration-slate-300 underline-offset-2 print:no-underline"
                  >
                    {data.profile.contact.github}
                  </a>
                </div>
              )}
              {data.profile.contact.location && (
                <div className="flex items-center gap-2">
                  <MapPin size={12} className="text-slate-700 print:text-black" />
                  <span>{data.profile.contact.location}</span>
                </div>
              )}
            </div>

            <div className="my-2 border-t border-slate-200 dark:border-slate-600 print:border-slate-800" />

            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">
                {data.education.school}({data.education.period})
              </div>
              <div className="text-[12px] text-slate-700 dark:text-slate-300 print:text-black">
                {data.education.degree}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-6 py-6 md:px-8 md:py-6 space-y-6">
        {/* Skills */}
        <section>
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-wider mb-3 pb-1 border-b border-slate-300 dark:border-slate-600 print:border-slate-800 print:text-black">
            技术栈
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {data.skillGroups.map((group, idx) => (
              <div key={idx}>
                <h3 className="text-[12px] font-bold text-slate-800 dark:text-slate-200 mb-1 print:text-black">
                  {group.name}
                </h3>
                <ul className="space-y-0.5">
                  {group.items.filter(nonEmpty).map((skill, i) => (
                    <li
                      key={i}
                      className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug print:text-black"
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
                className="relative pl-3 border-l border-slate-200 dark:border-slate-700 pb-4 border-b border-slate-200 dark:border-slate-700 print:border-slate-800 last:border-b-0"
              >
                <div className="absolute -left-[6px] top-1 w-2.5 h-2.5 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-400 print:bg-white print:border-slate-800" />

                <div>
                  {/* 第一行：公司 + 时间（主体信息，加粗突出） */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 mb-1">
                    <h3 className="text-[14px] font-bold text-slate-900 dark:text-white print:text-black">{exp.org}</h3>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 font-mono print:text-black">{exp.period}</p>
                  </div>

                  {/* 第二行：职位 + 职责概述（次要信息，字体缩小） */}
                  <div className="mb-2">
                    <p className="text-[12px] text-slate-800 dark:text-slate-200 font-semibold print:text-black">
                      {exp.role}
                    </p>
                    {exp.overview && (
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug mt-1 print:text-black">
                        {exp.overview}
                      </p>
                    )}
                  </div>
                </div>

                {!!exp.projects?.length && (
                  <div className="mt-3 space-y-2 pl-3">
                    {exp.projects.map((proj, projIndex) => (
                      <div
                        key={projIndex}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/30 p-3 print:bg-transparent print:border-slate-800"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                          <h4 className="text-[12px] font-bold text-slate-900 dark:text-white print:text-black">
                            {proj.name}
                          </h4>
                        </div>
                        {proj.description && (
                          <p className="mt-1 text-[11px] text-slate-700 dark:text-slate-300 leading-snug print:text-black">
                            {proj.description}
                          </p>
                        )}

                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <div className="text-[10px] font-bold text-slate-800 dark:text-slate-200 mb-1 print:text-black">
                              负责内容
                            </div>
                            <ul className="list-disc list-outside ml-4 space-y-0.5 text-[11px] text-slate-800 dark:text-slate-300 leading-snug print:text-black">
                              {proj.responsibilities.filter(nonEmpty).map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <div className="text-[10px] font-bold text-slate-800 dark:text-slate-200 mb-1 print:text-black">
                              成果亮点
                            </div>
                            <ul className="list-disc list-outside ml-4 space-y-0.5 text-[11px] text-slate-800 dark:text-slate-300 leading-snug print:text-black">
                              {proj.achievements.filter(nonEmpty).map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {!!proj.tech?.filter(nonEmpty).length && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {proj.tech.filter(nonEmpty).map((t, i) => (
                              <span
                                key={i}
                                className="pill print:border-slate-800 print:text-black print:bg-transparent"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <ul className="mt-2 list-disc list-outside ml-4 space-y-0.5 text-[12px] text-slate-800 dark:text-slate-300 leading-snug print:text-black">
                  {exp.highlights.filter(nonEmpty).map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {exp.tech.filter(nonEmpty).map((t, i) => (
                    <span key={i} className="pill print:border-slate-800 print:text-black print:bg-transparent">
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
