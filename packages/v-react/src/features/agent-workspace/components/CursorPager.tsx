import type { CursorPage } from '../domain';

export function CursorPager<T>({
  page,
  onCursor,
}: {
  page: CursorPage<T>;
  onCursor: (cursor: string | undefined) => void;
}) {
  if (!page.pageInfo.hasNext && !page.pageInfo.hasPrevious) return null;
  return (
    <nav className="aw-toolbar" aria-label="分页">
      <button
        className="aw-button aw-button--ghost"
        type="button"
        disabled={!page.pageInfo.hasPrevious}
        onClick={() => onCursor(page.pageInfo.previousCursor ?? undefined)}
      >
        上一页
      </button>
      <button
        className="aw-button aw-button--ghost"
        type="button"
        disabled={!page.pageInfo.hasNext}
        onClick={() => onCursor(page.pageInfo.nextCursor ?? undefined)}
      >
        下一页
      </button>
    </nav>
  );
}
