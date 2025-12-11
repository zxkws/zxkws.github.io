import dayjs from 'dayjs';
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
  const sorted = [...notes].sort((a, b) =>
    dayjs(b.updatedAt).valueOf() - dayjs(a.updatedAt).valueOf(),
  );

  return (
    <div className="note-list">
      {sorted.map((note) => (
        <div
          key={note.id}
          className={`note-item ${note.id === activeId ? 'active' : ''}`}
          onClick={() => onSelect(note.id)}
        >
          <div className="title">{note.title || note.slug}</div>
          <div className="meta">{dayjs(note.updatedAt).format('MM-DD HH:mm')}</div>
        </div>
      ))}
    </div>
  );
};
