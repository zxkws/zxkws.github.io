import type { PropsWithChildren } from 'react';

type PageLoadingProps = PropsWithChildren<{
  loading?: boolean;
}>;

const PageLoading = ({ children, loading = false }: PageLoadingProps) => {
  const overlay = loading ? (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-lg bg-[var(--color-bg)] px-6 py-4 text-[var(--color-text)] shadow-lg">
        <span
          className="inline-flex h-8 w-8 animate-spin rounded-full border-4"
          style={{
            borderColor: 'var(--spinner-track)',
            borderTopColor: 'var(--spinner-head)',
          }}
          aria-hidden="true"
        />
        <span className="text-sm font-medium tracking-wide">Loading...</span>
      </div>
    </div>
  ) : null;

  if (!children) {
    return overlay;
  }

  return (
    <>
      {children}
      {overlay}
    </>
  );
};

export default PageLoading;
