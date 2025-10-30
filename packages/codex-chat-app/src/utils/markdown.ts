const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeAttribute = (value: string) => escapeHtml(value).replace(/`/g, '&#96;');

type MarkdownSegment = { type: 'text'; content: string } | { type: 'code'; content: string; language?: string };

const CODE_BLOCK_REGEX = /```([\w-]+)?\n?([\s\S]*?)```/g;

const splitSegments = (content: string): MarkdownSegment[] => {
  const segments: MarkdownSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CODE_BLOCK_REGEX.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'code', language: match[1], content: match[2] ?? '' });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) });
  }
  return segments;
};

const renderList = (lines: string[]): string => {
  const isOrdered = lines.every((line) => /^\s*\d+\.\s+/.test(line));
  const tag = isOrdered ? 'ol' : 'ul';
  const items = lines.map((line) => {
    const normalized = line.replace(/^\s*(?:[-*+]\s+|\d+\.\s+)/, '');
    return `<li>${renderInline(normalized)}</li>`;
  });
  return `<${tag}>${items.join('')}</${tag}>`;
};

const renderInline = (raw: string): string => {
  const escaped = escapeHtml(raw.trim());
  if (!escaped) {
    return '';
  }
  let transformed = escaped;
  transformed = transformed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  transformed = transformed.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  transformed = transformed.replace(/`([^`]+)`/g, '<code>$1</code>');
  transformed = transformed.replace(
    /\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
    (_match, label: string, link: string) =>
      `<a href="${escapeAttribute(link)}" target="_blank" rel="noreferrer noopener">${label}</a>`,
  );
  const lines = transformed.split(/\n+/);
  if (lines.length === 1) {
    return `<p>${lines[0]}</p>`;
  }

  const isList = lines.every((line) => /^\s*(?:[-*+]\s+|\d+\.\s+)/.test(line));
  if (isList) {
    return renderList(lines);
  }

  return lines.map((line) => `<p>${line}</p>`).join('');
};

export const renderMarkdownToHtml = (content: string): string => {
  const segments = splitSegments(content);
  return segments
    .map((segment) => {
      if (segment.type === 'code') {
        const langAttr = segment.language ? ` data-lang="${escapeAttribute(segment.language)}"` : '';
        return `<pre><code${langAttr}>${escapeHtml(segment.content.trim())}</code></pre>`;
      }
      return renderInline(segment.content);
    })
    .join('');
};
