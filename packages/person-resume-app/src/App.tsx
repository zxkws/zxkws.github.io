import { MapPin, Github, Mail, Phone, ExternalLink } from 'lucide-react';
import './styles.css';
import { education, experiences, profile, projects, skillGroups } from './data/resume';

// Simple icons component map
const icons = {
  phone: Phone,
  email: Mail,
  github: Github,
  location: MapPin,
};

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 md:py-16 print:bg-white print:py-0">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 shadow-xl print:shadow-none print:bg-white rounded-lg overflow-hidden">
        {/* Header Section */}
        <header className="px-8 py-8 md:px-10 border-b border-slate-200 dark:border-slate-700 print:px-0 print:py-4 print:border-b-2 print:border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="flex-1">
              <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2 uppercase print:text-black">
                {profile.name}
              </h1>
              <p className="text-xl text-indigo-600 dark:text-indigo-400 font-medium mb-4 print:text-slate-700">
                {profile.title}
              </p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 max-w-2xl print:text-slate-700 text-justify">
                {profile.summary}
              </p>
            </div>

            {/* Contact Info - Right aligned on desktop/print */}
            <div className="flex flex-col gap-2 min-w-[200px] text-sm text-slate-600 dark:text-slate-400 print:text-slate-800">
              {profile.contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-indigo-500 print:text-slate-800" />
                  <span>{profile.contact.phone}</span>
                </div>
              )}
              {profile.contact.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-indigo-500 print:text-slate-800" />
                  <a
                    href={`mailto:${profile.contact.email}`}
                    className="hover:text-indigo-600 underline decoration-indigo-200 print:no-underline"
                  >
                    {profile.contact.email}
                  </a>
                </div>
              )}
              {profile.contact.github && (
                <div className="flex items-center gap-2">
                  <Github size={14} className="text-indigo-500 print:text-slate-800" />
                  <a
                    href={`https://${profile.contact.github}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-indigo-600 underline decoration-indigo-200 print:no-underline"
                  >
                    {profile.contact.github}
                  </a>
                </div>
              )}
              {profile.contact.location && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-indigo-500 print:text-slate-800" />
                  <span>{profile.contact.location}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-[2.2fr_1fr] print:grid-cols-[2.2fr_1fr] min-h-[800px]">
          {/* Left Column: Experience & Projects */}
          <main className="p-8 md:px-10 py-8 space-y-8 print:px-0 print:py-6 print:pr-6">
            {/* Experience Section */}
            <section>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-5 pb-1 border-b-2 border-indigo-500 print:border-slate-800 print:text-black">
                工作经历
              </h2>
              <div className="space-y-6">
                {experiences.map((exp, idx) => (
                  <div
                    key={idx}
                    className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-700 print:border-l-0 print:pl-0"
                  >
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-800 border-2 border-indigo-500 print:hidden"></div>

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base print:text-black">{exp.org}</h3>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 print:text-slate-600 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded print:bg-transparent print:p-0 print:font-bold">
                        {exp.period}
                      </span>
                    </div>

                    <div className="text-indigo-600 dark:text-indigo-400 font-medium text-sm mb-2 print:text-slate-700">
                      {exp.role}
                    </div>

                    <ul className="list-disc list-outside ml-4 space-y-1 text-sm text-slate-700 dark:text-slate-300 leading-relaxed text-justify print:text-black">
                      {exp.highlights.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>

                    {/* Tech stack for experience - visible on screen, minimal on print */}
                    <div className="mt-3 flex flex-wrap gap-1.5 print:hidden">
                      {exp.tech.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 text-[10px] bg-indigo-50 text-indigo-700 rounded dark:bg-indigo-500/10 dark:text-indigo-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Projects Section - Compact */}
            <section>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-5 pb-1 border-b-2 border-indigo-500 print:border-slate-800 print:text-black">
                精选项目
              </h2>
              <div className="grid gap-4">
                {projects.map((proj, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg print:bg-transparent print:p-0 print:border print:border-slate-200 print:p-2 print:rounded-none"
                  >
                    <div className="flex justify-between items-baseline mb-2">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm print:text-black">{proj.name}</h3>
                      <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider print:text-slate-600">
                        {proj.focus}
                      </span>
                    </div>
                    <ul className="list-disc list-outside ml-4 space-y-1 text-sm text-slate-600 dark:text-slate-300 print:text-black">
                      {proj.outcomes.map((out, i) => (
                        <li key={i}>{out}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </main>

          {/* Right Column: Skills & Education */}
          <aside className="bg-slate-50 dark:bg-slate-800/50 border-l border-slate-200 dark:border-slate-700 p-8 print:bg-transparent print:p-0 print:pt-6 print:pl-6 print:border-l-2 print:border-slate-200">
            {/* Skills */}
            <section className="mb-8">
              <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 pb-1 border-b border-indigo-200 dark:border-indigo-900 print:border-slate-300 print:text-black">
                技术栈
              </h2>
              <div className="space-y-6">
                {skillGroups.map((group, idx) => (
                  <div key={idx}>
                    <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-2 print:text-slate-800">
                      {group.name}
                    </h3>
                    <ul className="space-y-2">
                      {group.items.map((skill, i) => (
                        <li
                          key={i}
                          className="text-xs text-slate-600 dark:text-slate-300 leading-snug print:text-black font-medium"
                        >
                          • {skill}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* Education */}
            <section className="mb-8">
              <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 pb-1 border-b border-indigo-200 dark:border-indigo-900 print:border-slate-300 print:text-black">
                教育背景
              </h2>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm print:text-black">
                  {education.school}
                </h3>
                <div className="text-indigo-600 dark:text-indigo-400 text-xs font-medium mb-0.5 print:text-slate-700">
                  {education.degree}
                </div>
                <div className="text-slate-500 dark:text-slate-500 text-xs font-mono">{education.period}</div>
              </div>
            </section>

            {/* Print Only: QR or Link hint */}
            <div className="hidden print:block mt-10 pt-10 border-t border-slate-200">
              <div className="flex items-center gap-1 text-[10px] text-slate-400 justify-center">
                <span>Online version:</span>
                <span className="font-mono">https://zxkws.github.io/resume</span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Footer for Screen */}
      <footer className="mt-8 text-center text-slate-400 text-sm print:hidden">
        <p>
          Press <kbd className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">Cmd/Ctrl + P</kbd> to
          save as PDF
        </p>
      </footer>
    </div>
  );
}
