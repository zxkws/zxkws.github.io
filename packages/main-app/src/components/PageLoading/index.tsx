import type { PropsWithChildren } from 'react';

type PageLoadingProps = PropsWithChildren<{
  loading?: boolean;
}>;

const PageLoading = ({ children, loading = false }: PageLoadingProps) => {
  if (loading) {
    return <div className="flex flex-1 items-center justify-center">loading...</div>;
  }
  return <>{children}</>;
};

export default PageLoading;
