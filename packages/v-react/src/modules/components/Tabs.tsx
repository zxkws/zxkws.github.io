import { Note } from '../store';

export const Tabs = ({
  notes,
  openTabs,
  activeId,
  onSelect,
}: {
  notes: Record<string, Note>;
  openTabs: string[];
  activeId?: string;
  onSelect: (id: string) => void;
}) => {
  return (
    <div className="tabs">
      {openTabs.map((id) => {
        const n = notes[id];
        if (!n) return null;
        return (
          <div key={id} className={`tab ${id === activeId ? 'active' : ''}`} onClick={() => onSelect(id)}>
            {n.title || n.slug}
          </div>
        );
      })}
    </div>
  );
};
