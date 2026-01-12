import { Download, Eye, Pencil, Printer, RotateCcw, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import EditorPanel from './components/EditorPanel';
import ResumePreview from './components/ResumePreview';
import { RESUME_DATA_VERSION, defaultResumeData, type ResumeData } from './data/resume';
import './styles.css';

const STORAGE_KEY = 'resume-data';
const VERSION_KEY = 'resume-data-version';

function cloneResumeData(data: ResumeData): ResumeData {
  return JSON.parse(JSON.stringify(data)) as ResumeData;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback;
}

function asStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  return value.filter((v) => typeof v === 'string');
}

function normalizeResumeData(raw: unknown): ResumeData {
  const defaults = defaultResumeData;
  if (!isRecord(raw)) {
    return cloneResumeData(defaults);
  }

  const profileRaw = isRecord(raw.profile) ? raw.profile : {};
  const contactRaw = isRecord(profileRaw.contact) ? profileRaw.contact : {};

  const skillGroupsRaw = Array.isArray(raw.skillGroups) ? raw.skillGroups : defaults.skillGroups;
  const experiencesRaw = Array.isArray(raw.experiences) ? raw.experiences : defaults.experiences;
  const educationRaw = isRecord(raw.education) ? raw.education : {};

  return {
    profile: {
      name: asString(profileRaw.name, defaults.profile.name),
      title: asString(profileRaw.title, defaults.profile.title),
      summary: asString(profileRaw.summary, defaults.profile.summary),
      contact: {
        phone: asString(contactRaw.phone, defaults.profile.contact.phone),
        email: asString(contactRaw.email, defaults.profile.contact.email),
        github: asString(contactRaw.github, defaults.profile.contact.github),
        location: asString(contactRaw.location, defaults.profile.contact.location),
      },
    },
    skillGroups: (Array.isArray(skillGroupsRaw) ? skillGroupsRaw : []).map((g) => {
      const groupRaw = isRecord(g) ? g : {};
      return {
        name: asString(groupRaw.name, ''),
        items: asStringArray(groupRaw.items, []),
      };
    }),
    experiences: (Array.isArray(experiencesRaw) ? experiencesRaw : []).map((e, index) => {
      const expRaw = isRecord(e) ? e : {};

      const fallbackExp = defaults.experiences[index];

      const projectsRaw = Array.isArray(expRaw.projects) ? expRaw.projects : (fallbackExp?.projects ?? []);

      return {
        period: asString(expRaw.period, fallbackExp?.period ?? ''),
        org: asString(expRaw.org, fallbackExp?.org ?? ''),
        role: asString(expRaw.role, fallbackExp?.role ?? ''),
        overview: asString(expRaw.overview, fallbackExp?.overview ?? ''),
        projects: projectsRaw
          .filter((p) => isRecord(p))
          .map((p) => {
            const projRaw = p as Record<string, unknown>;
            return {
              name: asString(projRaw.name, ''),
              description: asString(projRaw.description, ''),
              responsibilities: asStringArray(projRaw.responsibilities, []),
              achievements: asStringArray(projRaw.achievements, []),
              tech: asStringArray(projRaw.tech, []),
            };
          }),
        highlights: asStringArray(expRaw.highlights, fallbackExp?.highlights ?? []),
        tech: asStringArray(expRaw.tech, fallbackExp?.tech ?? []),
      };
    }),
    education: {
      school: asString(educationRaw.school, defaults.education.school),
      degree: asString(educationRaw.degree, defaults.education.degree),
      period: asString(educationRaw.period, defaults.education.period),
    },
  };
}

function clearResumeCache(reason: string, savedVersion: string | null, currentVersion: string) {
  console.warn(
    `[Resume] ${reason}! Saved: ${savedVersion ?? 'null'}, Current: ${currentVersion}. Clearing cache...`,
  );

  try {
    const keysToRemove = new Set([
      STORAGE_KEY,
      VERSION_KEY,
      // Legacy keys (in case older builds used different names)
      'resumeData',
      'resumeDataVersion',
      'resume-data-v1',
      'resume-data-version-v1',
    ]);

    // Defensive: clear any older/experimental keys that start with resume-*
    // (GitHub Pages deployments sometimes ship multiple builds over time).
    const dynamicKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key === STORAGE_KEY ||
        key === VERSION_KEY ||
        key === 'resumeData' ||
        key === 'resumeDataVersion' ||
        key.startsWith('resume-') ||
        key.startsWith('resume_') ||
        key.startsWith('resumeData-')
      ) {
        dynamicKeys.push(key);
      }
    }

    dynamicKeys.forEach((k) => keysToRemove.add(k));
    Array.from(keysToRemove).forEach((key) => localStorage.removeItem(key));

    localStorage.setItem(VERSION_KEY, currentVersion);
    console.info(`[Resume] Cache cleared. ${VERSION_KEY}=${currentVersion}`);
  } catch (err) {
    console.error('[Resume] Failed to clear localStorage:', err);
  }
}

function loadResumeDataFromStorage(): ResumeData {
  const currentVersion = String(RESUME_DATA_VERSION);

  try {
    const savedVersion = (localStorage.getItem(VERSION_KEY) ?? '').trim() || null;

    console.info(
      `[Resume] Storage version check: saved=${savedVersion ?? 'null'}, current=${currentVersion}`,
    );

    if (savedVersion !== currentVersion) {
      clearResumeCache('Version mismatch', savedVersion, currentVersion);
      return normalizeResumeData(defaultResumeData);
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      console.info('[Resume] No cached resume payload, using defaults.');
      localStorage.setItem(VERSION_KEY, currentVersion);
      return normalizeResumeData(defaultResumeData);
    }

    console.info(
      `[Resume] Load storage ok: version=${currentVersion}, bytes=${saved.length}, loadedAt=${new Date().toISOString()}`,
    );

    return normalizeResumeData(JSON.parse(saved));
  } catch (err) {
    console.error('[Resume] Error loading data:', err);

    let savedVersion: string | null = null;
    try {
      savedVersion = localStorage.getItem(VERSION_KEY);
    } catch {
      savedVersion = null;
    }

    clearResumeCache('Load error', savedVersion, currentVersion);
    return normalizeResumeData(defaultResumeData);
  }
}

function saveResumeDataToStorage(data: ResumeData) {
  try {
    const payload = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, payload);
    localStorage.setItem(VERSION_KEY, String(RESUME_DATA_VERSION));

    if (import.meta.env.DEV) {
      console.debug(
        `[Resume] Saved to localStorage: version=${String(RESUME_DATA_VERSION)}, bytes=${payload.length}`,
      );
    }
  } catch (err) {
    console.error('[Resume] Error saving data:', err);
  }
}

function downloadJson(data: ResumeData) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  const safeName = (data.profile.name || 'resume').replace(/[\\/:*?"<>|\s]+/g, '-');
  const filename = `${safeName}-${y}${m}${d}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function ToolbarButton({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/80 backdrop-blur px-3 py-2 shadow-sm hover:bg-white dark:hover:bg-slate-900 text-[12px] font-semibold text-slate-700 dark:text-slate-200"
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export default function App() {
  const [isEditing, setIsEditing] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData>(() => loadResumeDataFromStorage());
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.info(
      `[Resume] App mounted. version=${String(RESUME_DATA_VERSION)}, mode=${import.meta.env.MODE}, base=${import.meta.env.BASE_URL}`,
    );
  }, []);

  useEffect(() => {
    saveResumeDataToStorage(resumeData);
  }, [resumeData]);

  useEffect(() => {
    const name = resumeData.profile.name.trim();
    const title = resumeData.profile.title.trim();
    document.title = name && title ? `${name} - ${title}` : name || title || 'Resume';
  }, [resumeData.profile.name, resumeData.profile.title]);

  const handleExportJson = () => downloadJson(resumeData);

  const handleImportJsonClick = () => {
    importInputRef.current?.click();
  };

  const handleImportJsonChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      setResumeData(normalizeResumeData(parsed));
    } catch {
      window.alert('导入失败：请选择有效的 JSON 文件');
    }
  };

  const handlePrint = () => {
    console.info('[Resume] Print requested.');
    window.requestAnimationFrame(() => window.print());
  };

  const handleResetToDefault = () => {
    if (!window.confirm('确定要重置为代码中的默认数据？当前编辑内容将丢失。')) {
      return;
    }

    try {
      const currentVersion = String(RESUME_DATA_VERSION);
      const savedVersion = (localStorage.getItem(VERSION_KEY) ?? '').trim() || null;
      clearResumeCache('Manual reset', savedVersion, currentVersion);
    } catch (err) {
      console.error('[Resume] Failed to reset localStorage:', err);
    }

    setResumeData(cloneResumeData(defaultResumeData));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-6 md:py-8 print:bg-white print:py-0">
      {/* Right-top toolbar */}
      <div className="no-print fixed top-4 right-4 z-50 flex flex-col sm:flex-row items-end gap-2">
        <ToolbarButton onClick={() => setIsEditing((v) => !v)} label={isEditing ? '预览模式' : '编辑模式'}>
          {isEditing ? <Eye size={16} /> : <Pencil size={16} />}
        </ToolbarButton>
        <ToolbarButton onClick={handleExportJson} label="导出 JSON">
          <Download size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={handleImportJsonClick} label="导入 JSON">
          <Upload size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={handlePrint} label="打印 / PDF">
          <Printer size={16} />
        </ToolbarButton>
        {import.meta.env.DEV && (
          <ToolbarButton onClick={handleResetToDefault} label="重置为默认">
            <RotateCcw size={16} />
          </ToolbarButton>
        )}
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportJsonChange}
      />

      {isEditing ? (
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4 items-start">
            <div className="no-print lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] overflow-auto">
              <EditorPanel data={resumeData} onChange={setResumeData} />
            </div>

            <div className="hidden lg:block print:block">
              <div className="max-w-4xl mx-auto">
                <ResumePreview data={resumeData} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 md:px-0">
          <ResumePreview data={resumeData} />
        </div>
      )}
    </div>
  );
}
