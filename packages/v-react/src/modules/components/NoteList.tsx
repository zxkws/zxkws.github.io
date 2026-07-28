import { Note } from '../store';

export const NoteList = ({
  notes,
  activeId,
  onSelect,
}: {
  notes: Note[];
  activeId?: string;
  onSelect: (id: string) => void;
}) => {
  return (
    <div className="note-list">
      {notes.map((note) => (
        <button
          type="button"
          key={note.id}
          className={`note-item ${note.id === activeId ? 'active' : ''}`}
          onClick={() => onSelect(note.id)}
        >
          <span className="title">{note.title}</span>
          <span className="meta">{note.updatedAt}</span>
        </button>
      ))}
    </div>
  );
};
