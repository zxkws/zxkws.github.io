import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import dayjs from 'dayjs';

export type Note = {
  id: string;
  title: string;
  slug: string;
  contentMd: string;
  isDaily: boolean;
  tags?: string[];
  version: number;
  updatedAt: string;
};

type UIState = {
  openTabs: string[];
  activeId?: string;
};

type NoteState = {
  notes: Record<string, Note>;
  ui: UIState;
  upsert(note: Note): void;
  setActive(id: string): void;
  closeTab(id: string): void;
  ensureTab(id: string): void;
  removeLocal(id: string): void;
  syncFromServer(notes: Note[]): void;
};

export const useNoteStore = create<NoteState>()(
  persist(
    (set, get) => ({
      notes: {},
      ui: { openTabs: [] },
      upsert(note) {
        set((state) => ({
          notes: { ...state.notes, [note.id]: note },
        }));
        get().ensureTab(note.id);
      },
      // 服务端列表为准，但本地版本更新时（刚保存成功、列表还没刷新到）保留本地副本
      syncFromServer(list) {
        set((state) => {
          const notes: Record<string, Note> = {};
          list.forEach((n) => {
            const local = state.notes[n.id];
            notes[n.id] = local && local.version > n.version ? local : n;
          });
          return { notes };
        });
      },
      setActive(id) {
        set((state) => ({ ui: { ...state.ui, activeId: id } }));
      },
      ensureTab(id) {
        set((state) => {
          const openTabs = state.ui.openTabs.includes(id) ? state.ui.openTabs : [...state.ui.openTabs, id];
          return { ui: { ...state.ui, openTabs, activeId: id } };
        });
      },
      closeTab(id) {
        set((state) => {
          const openTabs = state.ui.openTabs.filter((t) => t !== id);
          const activeId = state.ui.activeId === id ? openTabs.at(-1) : state.ui.activeId;
          return { ui: { openTabs, activeId }, notes: state.notes };
        });
      },
      removeLocal(id) {
        set((state) => {
          const { [id]: _, ...rest } = state.notes;
          const openTabs = state.ui.openTabs.filter((t) => t !== id);
          const activeId = state.ui.activeId === id ? openTabs.at(-1) : state.ui.activeId;
          return { notes: rest, ui: { openTabs, activeId } };
        });
      },
    }),
    {
      name: 'v-note-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ notes: state.notes, ui: state.ui }),
      version: 1,
      migrate: (state) => state,
    },
  ),
);

export const createEmptyDaily = () => {
  const date = dayjs().format('YYYY-MM-DD');
  return {
    title: date,
    slug: date,
    contentMd: `# ${date}\n\n`,
    isDaily: true,
    tags: [],
  };
};
