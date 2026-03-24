import { memo, useMemo } from 'react';

import { renderMarkdownToHtml } from '../utils/markdown';

type MarkdownProps = {
  content: string;
};

const Markdown = memo(({ content }: MarkdownProps) => {
  const html = useMemo(() => renderMarkdownToHtml(content), [content]);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
});

Markdown.displayName = 'Markdown';

export default Markdown;
