import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Note } from '../store';
import { useState } from 'react';

export const Editor = ({
  note,
  onChange,
}: {
  note: Note;
  onChange: (md: string) => void;
}) => {
  const [value, setValue] = useState(note.contentMd);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setValue(next);
    onChange(next);
  };

  return (
    <div className="editor">
      <textarea value={value} onChange={handleChange} />
      <div className="preview">
        <ReactMarkdown
          remarkPlugins={[remarkGfm as any]}
          rehypePlugins={[rehypeHighlight as any]}
        >
          {value}
        </ReactMarkdown>
      </div>
    </div>
  );
};
