import type { SVGProps } from 'react';

export type AppIconName =
  | 'activity'
  | 'book'
  | 'braces'
  | 'card'
  | 'check'
  | 'chess'
  | 'database'
  | 'diff'
  | 'grid'
  | 'home'
  | 'idea'
  | 'note'
  | 'shield'
  | 'sparkles'
  | 'terminal'
  | 'users'
  | 'video';

type AppIconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: AppIconName;
  size?: number;
};

export const resolveAppIcon = (path?: string, name?: string): AppIconName => {
  const value = `${path ?? ''} ${name ?? ''}`.toLowerCase();
  if (path === '/') return 'home';
  if (value.includes('product-lab') || value.includes('产品构想')) return 'idea';
  if (value.includes('chess') || value.includes('象棋')) return 'chess';
  if (value.includes('text-difference') || value.includes('textdiff') || value.includes('文本比对')) return 'diff';
  if (value.includes('json')) return 'braces';
  if (value.includes('curl')) return 'terminal';
  if (value.includes('pdf')) return 'note';
  if (value.includes('file-manager') || value.includes('文件管理')) return 'note';
  if (value.includes('blog') || value.includes('博客')) return 'book';
  if (value.includes('db-ops') || value.includes('database') || value.includes('数据库')) return 'database';
  if (
    value.includes('assistant') ||
    value.includes('ai-admin') ||
    value.includes('model') ||
    value.includes('语音') ||
    value.includes('模型')
  ) {
    return 'sparkles';
  }
  if (value.includes('knowledge') || value.includes('知识库')) return 'book';
  if (value.includes('permission') || value.includes('权限')) return 'shield';
  if (value.includes('account-vault') || value.includes('保险库')) return 'shield';
  if (value.includes('user') || value.includes('用户')) return 'users';
  if (value.includes('note') || value.includes('笔记')) return 'note';
  if (value.includes('keepalive') || value.includes('保活')) return 'activity';
  if (value.includes('payment') || value.includes('支付')) return 'card';
  if (value.includes('todo') || value.includes('代办')) return 'check';
  if (value.includes('watch') || value.includes('一起看')) return 'video';
  return 'grid';
};

const AppIcon = ({ name, size = 18, ...props }: AppIconProps) => {
  const content = (() => {
    switch (name) {
      case 'home':
        return (
          <>
            <path d="m3 10 9-7 9 7" />
            <path d="M5 9.5V21h14V9.5" />
            <path d="M9 21v-7h6v7" />
          </>
        );
      case 'idea':
        return (
          <>
            <path d="M9 18h6M10 22h4" />
            <path d="M8.4 15.5A7 7 0 1 1 15.6 15.5C14.6 16.2 14 17 14 18h-4c0-1-.6-1.8-1.6-2.5Z" />
            <path d="M12 6v5M9.5 9.5h5" />
          </>
        );
      case 'chess':
        return (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M8 8h8M9 12h6M8 16h8M12 7v10" />
          </>
        );
      case 'diff':
        return (
          <>
            <path d="M8 4H4v16h4M16 4h4v16h-4" />
            <path d="M9 9h6M12 6v6M9 16h6" />
          </>
        );
      case 'braces':
        return (
          <>
            <path d="M8 3H6a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h2" />
            <path d="M16 3h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-2" />
          </>
        );
      case 'terminal':
        return (
          <>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="m7 9 3 3-3 3M13 15h4" />
          </>
        );
      case 'database':
        return (
          <>
            <ellipse cx="12" cy="5" rx="8" ry="3" />
            <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
            <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
          </>
        );
      case 'sparkles':
        return (
          <>
            <path d="m12 3 1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4L12 3Z" />
            <path d="m6 13 .9 2.1L9 16l-2.1.9L6 19l-.9-2.1L3 16l2.1-.9L6 13ZM18 14l.7 1.3L20 16l-1.3.7L18 18l-.7-1.3L16 16l1.3-.7L18 14Z" />
          </>
        );
      case 'book':
        return (
          <>
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
            <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" />
          </>
        );
      case 'shield':
        return (
          <>
            <path d="M12 3 4 6v5c0 5.2 3.4 8.6 8 10 4.6-1.4 8-4.8 8-10V6l-8-3Z" />
            <path d="m9 12 2 2 4-4" />
          </>
        );
      case 'users':
        return (
          <>
            <circle cx="9" cy="8" r="3" />
            <path d="M3 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2" />
            <path d="M16 4a3 3 0 0 1 0 6M18 13a4 4 0 0 1 3 4v2" />
          </>
        );
      case 'note':
        return (
          <>
            <path d="M5 3h14v18H5z" />
            <path d="M8 8h8M8 12h8M8 16h5" />
          </>
        );
      case 'activity':
        return <path d="M3 12h4l2.5-7 5 14 2.5-7h4" />;
      case 'card':
        return (
          <>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 10h18M7 15h3" />
          </>
        );
      case 'check':
        return (
          <>
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <path d="m8 12 3 3 5-6" />
          </>
        );
      case 'video':
        return (
          <>
            <rect x="3" y="6" width="13" height="12" rx="2" />
            <path d="m16 10 5-3v10l-5-3" />
          </>
        );
      default:
        return (
          <>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </>
        );
    }
  })();

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {content}
    </svg>
  );
};

export default AppIcon;
