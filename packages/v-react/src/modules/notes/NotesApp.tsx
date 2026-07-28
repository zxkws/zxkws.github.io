import { useEffect } from 'react';
import { useNotes } from '../useNotes';
import { NoteList } from '../components/NoteList';
import { Tabs } from '../components/Tabs';
import { Editor } from '../components/Editor';
import { StatusBar } from '../components/StatusBar';

export const NotesApp = ({ basename }: { basename?: string }) => {
  const { listQuery, notes, ui, activeNote, saving, errorMessage, setActive, createToday, createBlank, updateContent } =
    useNotes();

  useEffect(() => {
    if (!ui.activeId && ui.openTabs.length === 0 && listQuery.data?.[0]) {
      setActive(listQuery.data[0].id);
    }
  }, [ui.activeId, ui.openTabs.length, listQuery.data, setActive]);

  return (
    <div className="layout" data-basename={basename}>
      <aside className="sidebar">
        <div className="toolbar">
          <button onClick={createToday}>今日</button>
          <button onClick={createBlank}>新建</button>
        </div>
        {errorMessage && (
          <div className="notes-error" role="alert">
            {errorMessage}
          </div>
        )}
        <NoteList notes={Object.values(notes)} activeId={ui.activeId} onSelect={setActive} />
      </aside>
      <main className="main">
        <Tabs notes={notes} openTabs={ui.openTabs} activeId={ui.activeId} onSelect={setActive} />
        {activeNote ? (
          <Editor note={activeNote} onChange={(md) => updateContent(activeNote.id, md, activeNote.version)} />
        ) : (
          <div className="empty">{listQuery.isFetching ? '正在加载笔记…' : '选择或创建一条笔记'}</div>
        )}
        <StatusBar saving={saving} loading={listQuery.isFetching} />
      </main>
    </div>
  );
};
