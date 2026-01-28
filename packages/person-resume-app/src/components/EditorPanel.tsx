import { Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Experience, Project, ResumeData, SkillGroup } from '../data/resume';

type Props = {
  data: ResumeData;
  onChange: (next: ResumeData) => void;
};

const inputClassName =
  'w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400';

const textareaClassName =
  'w-full min-h-[88px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400';

const emptyProject: Project = {
  name: '',
  description: '',
  responsibilities: [''],
  achievements: [''],
  tech: [''],
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card">
      <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wider mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-1">{label}</div>
      {children}
    </label>
  );
}

function IconButton({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-900 px-2 py-1 text-slate-700 dark:text-slate-200"
    >
      {children}
    </button>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-900 px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-200"
    >
      <Plus size={14} />
      {label}
    </button>
  );
}

function removeAt<T>(items: T[], index: number) {
  return items.filter((_, i) => i !== index);
}

function updateAt<T>(items: T[], index: number, next: T) {
  return items.map((item, i) => (i === index ? next : item));
}

function StringListEditor({
  label,
  items,
  placeholder,
  onChange,
  addLabel,
}: {
  label: string;
  items: string[];
  placeholder: string;
  addLabel: string;
  onChange: (next: string[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{label}</div>
        <AddButton label={addLabel} onClick={() => onChange([...items, ''])} />
      </div>
      <div className="space-y-2">
        {items.map((value, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              className={inputClassName}
              value={value}
              placeholder={placeholder}
              onChange={(e) => onChange(updateAt(items, idx, e.target.value))}
            />
            <IconButton title="删除" onClick={() => onChange(removeAt(items, idx))}>
              <Trash2 size={14} />
            </IconButton>
          </div>
        ))}
        {!items.length && <div className="text-[12px] text-slate-400">暂无内容</div>}
      </div>
    </div>
  );
}

export default function EditorPanel({ data, onChange }: Props) {
  const updateProfile = (patch: Partial<ResumeData['profile']>) => {
    onChange({ ...data, profile: { ...data.profile, ...patch } });
  };

  const updateContact = (patch: Partial<ResumeData['profile']['contact']>) => {
    onChange({
      ...data,
      profile: { ...data.profile, contact: { ...data.profile.contact, ...patch } },
    });
  };

  const updateEducation = (patch: Partial<ResumeData['education']>) => {
    onChange({ ...data, education: { ...data.education, ...patch } });
  };

  const updateSkillGroups = (next: SkillGroup[]) => onChange({ ...data, skillGroups: next });
  const updateExperiences = (next: Experience[]) => onChange({ ...data, experiences: next });

  return (
    <div className="space-y-4">
      <Section title="个人信息">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="姓名">
            <input
              className={inputClassName}
              value={data.profile.name}
              onChange={(e) => updateProfile({ name: e.target.value })}
            />
          </Field>
          <Field label="职位">
            <input
              className={inputClassName}
              value={data.profile.title}
              onChange={(e) => updateProfile({ title: e.target.value })}
            />
          </Field>
          <Field label="电话">
            <input
              className={inputClassName}
              value={data.profile.contact.phone}
              onChange={(e) => updateContact({ phone: e.target.value })}
            />
          </Field>
          <Field label="邮箱">
            <input
              className={inputClassName}
              value={data.profile.contact.email}
              onChange={(e) => updateContact({ email: e.target.value })}
            />
          </Field>
          <Field label="GitHub">
            <input
              className={inputClassName}
              value={data.profile.contact.github}
              onChange={(e) => updateContact({ github: e.target.value })}
            />
          </Field>
          <Field label="位置">
            <input
              className={inputClassName}
              value={data.profile.contact.location}
              onChange={(e) => updateContact({ location: e.target.value })}
            />
          </Field>
        </div>
        <Field label="个人总结">
          <textarea
            className={textareaClassName}
            value={data.profile.summary}
            onChange={(e) => updateProfile({ summary: e.target.value })}
          />
        </Field>
      </Section>

      <Section title="技能栈">
        <div className="space-y-3">
          {data.skillGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <StringListEditor
                label="技能项"
                items={group.items}
                placeholder="例如：React / TypeScript / Webpack"
                addLabel="添加技能项"
                onChange={(items) => updateSkillGroups(updateAt(data.skillGroups, groupIndex, { ...group, items }))}
              />
            </div>
          ))}
          {!data.skillGroups.length && <div className="text-[12px] text-slate-400">暂无技能组</div>}
        </div>
      </Section>

      <Section title="工作经历">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[12px] text-slate-500 dark:text-slate-300">
            时间 / 公司 / 职位 / 职责概述 / 项目 / 亮点 / 技术栈
          </div>
          <AddButton
            label="添加经历"
            onClick={() =>
              updateExperiences([
                ...data.experiences,
                { period: '', org: '', role: '', overview: '', projects: [], highlights: [''], tech: [''] },
              ])
            }
          />
        </div>

        <div className="space-y-3">
          {data.experiences.map((exp, idx) => (
            <div key={idx} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200">经历 #{idx + 1}</div>
                <IconButton title="删除经历" onClick={() => updateExperiences(removeAt(data.experiences, idx))}>
                  <Trash2 size={14} />
                </IconButton>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="时间">
                  <input
                    className={inputClassName}
                    value={exp.period}
                    placeholder="例如：2023.10 – 2025.03"
                    onChange={(e) =>
                      updateExperiences(updateAt(data.experiences, idx, { ...exp, period: e.target.value }))
                    }
                  />
                </Field>
                <Field label="公司">
                  <input
                    className={inputClassName}
                    value={exp.org}
                    placeholder="公司名称"
                    onChange={(e) =>
                      updateExperiences(updateAt(data.experiences, idx, { ...exp, org: e.target.value }))
                    }
                  />
                </Field>
                <Field label="项目名称">
                  <input
                    className={inputClassName}
                    value={exp.role}
                    placeholder="项目名称"
                    onChange={(e) =>
                      updateExperiences(updateAt(data.experiences, idx, { ...exp, role: e.target.value }))
                    }
                  />
                </Field>
              </div>

              <div className="mt-3">
                <Field label="项目概述">
                  <textarea
                    className={textareaClassName}
                    value={exp.overview}
                    placeholder="1-2 句话概述该项目"
                    onChange={(e) =>
                      updateExperiences(updateAt(data.experiences, idx, { ...exp, overview: e.target.value }))
                    }
                  />
                </Field>
              </div>

              <div className="mt-3 space-y-3">
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">项目</div>
                    <AddButton
                      label="添加项目"
                      onClick={() =>
                        updateExperiences(
                          updateAt(data.experiences, idx, {
                            ...exp,
                            projects: [...exp.projects, { ...emptyProject }],
                          }),
                        )
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    {exp.projects.map((proj, projIndex) => (
                      <div
                        key={projIndex}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 p-3"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                            项目 #{projIndex + 1}
                          </div>
                          <IconButton
                            title="删除项目"
                            onClick={() =>
                              updateExperiences(
                                updateAt(data.experiences, idx, {
                                  ...exp,
                                  projects: removeAt(exp.projects, projIndex),
                                }),
                              )
                            }
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Field label="项目名称">
                            <input
                              className={inputClassName}
                              value={proj.name}
                              placeholder="例如：云监控微前端架构改造"
                              onChange={(e) =>
                                updateExperiences(
                                  updateAt(data.experiences, idx, {
                                    ...exp,
                                    projects: updateAt(exp.projects, projIndex, { ...proj, name: e.target.value }),
                                  }),
                                )
                              }
                            />
                          </Field>
                        </div>

                        <div className="mt-3">
                          <Field label="项目描述">
                            <textarea
                              className={textareaClassName}
                              value={proj.description}
                              placeholder="背景、规模、用户/业务价值（可写 1-2 句）"
                              onChange={(e) =>
                                updateExperiences(
                                  updateAt(data.experiences, idx, {
                                    ...exp,
                                    projects: updateAt(exp.projects, projIndex, {
                                      ...proj,
                                      description: e.target.value,
                                    }),
                                  }),
                                )
                              }
                            />
                          </Field>
                        </div>

                        <div className="mt-3 space-y-3">
                          <StringListEditor
                            label="负责内容"
                            items={proj.responsibilities}
                            placeholder="我负责了什么"
                            addLabel="添加一条"
                            onChange={(responsibilities) =>
                              updateExperiences(
                                updateAt(data.experiences, idx, {
                                  ...exp,
                                  projects: updateAt(exp.projects, projIndex, { ...proj, responsibilities }),
                                }),
                              )
                            }
                          />

                          <StringListEditor
                            label="成果亮点"
                            items={proj.achievements}
                            placeholder="用量化数据表达影响"
                            addLabel="添加一条"
                            onChange={(achievements) =>
                              updateExperiences(
                                updateAt(data.experiences, idx, {
                                  ...exp,
                                  projects: updateAt(exp.projects, projIndex, { ...proj, achievements }),
                                }),
                              )
                            }
                          />

                          <StringListEditor
                            label="技术栈"
                            items={proj.tech}
                            placeholder="例如：React / Webpack 5 / Module Federation"
                            addLabel="添加技术项"
                            onChange={(tech) =>
                              updateExperiences(
                                updateAt(data.experiences, idx, {
                                  ...exp,
                                  projects: updateAt(exp.projects, projIndex, { ...proj, tech }),
                                }),
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                    {!exp.projects.length && <div className="text-[12px] text-slate-400">暂无项目</div>}
                  </div>
                </div>

                <StringListEditor
                  label="亮点"
                  items={exp.highlights}
                  placeholder="一条亮点描述"
                  addLabel="添加亮点"
                  onChange={(highlights) => updateExperiences(updateAt(data.experiences, idx, { ...exp, highlights }))}
                />

                <StringListEditor
                  label="技术栈"
                  items={exp.tech}
                  placeholder="例如：React / TypeScript / Vite"
                  addLabel="添加技术项"
                  onChange={(tech) => updateExperiences(updateAt(data.experiences, idx, { ...exp, tech }))}
                />
              </div>
            </div>
          ))}
          {!data.experiences.length && <div className="text-[12px] text-slate-400">暂无工作经历</div>}
        </div>
      </Section>

      <Section title="教育背景">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="学校">
            <input
              className={inputClassName}
              value={data.education.school}
              onChange={(e) => updateEducation({ school: e.target.value })}
            />
          </Field>
          <Field label="专业">
            <input
              className={inputClassName}
              value={data.education.degree}
              onChange={(e) => updateEducation({ degree: e.target.value })}
            />
          </Field>
          <Field label="时间">
            <input
              className={inputClassName}
              value={data.education.period}
              onChange={(e) => updateEducation({ period: e.target.value })}
            />
          </Field>
        </div>
      </Section>
    </div>
  );
}
